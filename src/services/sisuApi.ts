import axios, { AxiosError } from 'axios';

export interface Institution {
  co_ies: string;
  no_ies: string;
  sg_ies: string;
  sg_uf: string;
  no_municipio: string;
}

export interface MedicineInstitution {
  co_ies: string;
  name: string;
  shortName: string;
  state: string;
  city: string;
  lastUpdate: string;
}

export interface Course {
  co_curso_emec: string;
  co_oferta: string;
  no_curso: string;
  nu_peso_l: string;
  nu_peso_ch: string;
  nu_peso_cn: string;
  nu_peso_m: string;
  nu_peso_r: string;
  no_municipio_campus: string;
  no_campus: string;
}

export interface CutoffScore {
  co_concorrencia: string;
  nu_nota_corte: string;
  dt_nota_corte: string;
}

export interface UniversityData {
  name: string;
  shortName: string;
  state: string;
  city: string;
  courseId: string;
  minScore: number;
  weight: {
    linguagens: number;
    humanas: number;
    natureza: number;
    matematica: number;
    redacao: number;
  };
  lastUpdate: string;
}

export class SisuApiService {
  private readonly baseUrl = 'https://sisu-api.sisu.mec.gov.br/api/v1';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  private async fetchWithRetry<T>(endpoint: string, retries = this.maxRetries): Promise<T> {
    try {
      console.log(`🔄 Making request to: ${endpoint}`);
      const response = await axios.get<T>(`${this.baseUrl}${endpoint}`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Request successful: ${endpoint}`);
      return response.data;
    } catch (error) {
      if (retries > 0) {
        console.log(`❌ Request failed for ${endpoint}, retrying... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.fetchWithRetry(endpoint, retries - 1);
      }
      throw error;
    }
  }

  private async getInstitutions(): Promise<Institution[]> {
    try {
      const institutionsResponse = await this.fetchWithRetry<Record<string, Institution[]>>('/oferta/instituicoes/uf');
      return Object.values(institutionsResponse).flat();
    } catch (error) {
      console.error('Failed to get institutions:', error);
      throw error;
    }
  }

  private async getCourses(co_ies: string): Promise<Course[]> {
    try {
      const coursesResponse = await this.fetchWithRetry<Record<string, Course>>(`/oferta/instituicao/${co_ies}`);
      if (!coursesResponse) {
        console.log(`No courses found for institution ${co_ies}`);
        return [];
      }
      const courses = Object.values(coursesResponse);
      if (!Array.isArray(courses) || courses.length === 0) {
        console.log(`No courses array found for institution ${co_ies}`);
        return [];
      }
      return courses.filter(course => course && typeof course === 'object' && 'no_curso' in course);
    } catch (error) {
      console.error(`Failed to get courses for institution ${co_ies}:`, error);
      return [];
    }
  }

  private async getModalities(courseId: string): Promise<CutoffScore[]> {
    const response = await this.fetchWithRetry<any>(`/oferta/${courseId}/modalidades`);
    console.log(`Raw course weights: ${JSON.stringify(response.pesos, null, 2)}`);

    return response.modalidades
      .filter((modalidade: any) => modalidade.co_concorrencia === "0")
      .map((modalidade: any) => ({
        co_concorrencia: modalidade.co_concorrencia,
        nu_nota_corte: modalidade.nu_nota_corte,
        dt_nota_corte: modalidade.dt_nota_corte
      }));
  }

  private isMedicineCourse(courseName: string): boolean {
    // Only match exact "MEDICINA" or "Medicina", not partial matches like "BIOMEDICINA"
    const name = courseName.toLowerCase().trim();
    const isMedicine = name === 'medicina';
    if (!isMedicine && name.includes('medicina')) {
      console.log(`Filtered out course: ${courseName}`);
    }
    return isMedicine;
  }

  private parseWeight(weight: string): number {
    // Convert weight from string to number, defaulting to 1 if invalid
    const parsed = parseFloat(weight);
    console.log('Parsing weight:', { original: weight, parsed: parsed || 1 });
    return isNaN(parsed) ? 1 : parsed;
  }

  async findMedicineInstitutions(): Promise<MedicineInstitution[]> {
    const medicineInstitutions: MedicineInstitution[] = [];
    const data = await this.getInstitutions();

    for (const institution of data) {
      try {
        const courses = await this.getCourses(institution.co_ies);
        const hasMedicine = courses.some(course => 
          course.no_curso && this.isMedicineCourse(course.no_curso)
        );

        if (hasMedicine) {
          const medicineCourse = courses.find(course => 
            course.no_curso && this.isMedicineCourse(course.no_curso)
          );

          medicineInstitutions.push({
            co_ies: institution.co_ies,
            name: medicineCourse?.no_campus || institution.no_ies,
            shortName: institution.sg_ies,
            state: institution.sg_uf,
            city: medicineCourse?.no_municipio_campus || institution.no_municipio,
            lastUpdate: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Failed to get courses for institution ${institution.co_ies}:`, error);
      }
    }

    return medicineInstitutions;
  }

  async getAllMedicineData(medicineInstitutions: MedicineInstitution[]): Promise<UniversityData[]> {
    const universities: UniversityData[] = [];

    for (const institution of medicineInstitutions) {
      try {
        const courses = await this.getCourses(institution.co_ies);
        const medicineCourses = courses.filter(course => 
          course.no_curso && this.isMedicineCourse(course.no_curso)
        );

        for (const course of medicineCourses) {
          try {
            const modalities = await this.getModalities(course.co_oferta);
            
            if (modalities.length) {
              // Debug log raw course weights
              console.log('Raw course weights:', {
                courseName: course.no_curso,
                weights: {
                  linguagens: course.nu_peso_l,
                  humanas: course.nu_peso_ch,
                  natureza: course.nu_peso_cn,
                  matematica: course.nu_peso_m,
                  redacao: course.nu_peso_r
                }
              });

              // Get the highest weighted cutoff score among all modalities
              const highestCutoff = Math.max(
                ...modalities
                  .map(m => {
                    const score = parseFloat(m.nu_nota_corte);
                    if (isNaN(score)) return 0;
                    
                    // Calculate weighted score
                    const weightedScore = (
                      score * this.parseWeight(course.nu_peso_l) +
                      score * this.parseWeight(course.nu_peso_ch) +
                      score * this.parseWeight(course.nu_peso_cn) +
                      score * this.parseWeight(course.nu_peso_m) +
                      score * this.parseWeight(course.nu_peso_r)
                    ) / (
                      this.parseWeight(course.nu_peso_l) +
                      this.parseWeight(course.nu_peso_ch) +
                      this.parseWeight(course.nu_peso_cn) +
                      this.parseWeight(course.nu_peso_m) +
                      this.parseWeight(course.nu_peso_r)
                    );
                    
                    return weightedScore;
                  })
                  .filter(score => !isNaN(score) && score > 0)
              );

              universities.push({
                name: course.no_campus,
                shortName: institution.shortName,
                state: institution.state,
                city: course.no_municipio_campus,
                courseId: course.co_oferta,
                minScore: highestCutoff,
                weight: {
                  linguagens: this.parseWeight(course.nu_peso_l),
                  humanas: this.parseWeight(course.nu_peso_ch),
                  natureza: this.parseWeight(course.nu_peso_cn),
                  matematica: this.parseWeight(course.nu_peso_m),
                  redacao: this.parseWeight(course.nu_peso_r)
                },
                lastUpdate: institution.lastUpdate
              });
            }
          } catch (error) {
            console.error(`Failed to get modalities for course ${course.co_oferta}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to get courses for institution ${institution.co_ies}:`, error);
      }
    }

    return universities;
  }
}