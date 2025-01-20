import { SisuApiService } from '../src/services/sisuApi';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function populateDatabase() {
  try {
    console.log('Starting database population...');

    const sisuApi = new SisuApiService();
    const medicineInstitutions = await sisuApi.findMedicineInstitutions();
    
    const universities = await sisuApi.getAllMedicineData(medicineInstitutions);
    
    console.log('Universities data:', universities);

    // Save medicine institutions to database
    console.log(`Found ${medicineInstitutions.length} institutions with medicine courses`);
    const { error: institutionsError } = await supabase
      .from('medicine_institutions')
      .upsert(
        medicineInstitutions.map(inst => ({
          co_ies: inst.co_ies,
          name: inst.name,
          short_name: inst.shortName,
          state: inst.state,
          city: inst.city,
          last_update: inst.lastUpdate
        })),
        { onConflict: 'co_ies' }
      );

    if (institutionsError) {
      console.error('Error saving medicine institutions:', institutionsError);
      return;
    }

    console.log(`Found ${universities.length} medicine courses`);
    const { error: universitiesError } = await supabase
      .from('universities')
      .upsert(
        universities.map(uni => ({
          name: uni.name,
          short_name: uni.shortName,
          state: uni.state,
          city: uni.city,
          course_id: uni.courseId,
          min_score: uni.minScore,
          weight_linguagens: uni.weight.linguagens,
          weight_humanas: uni.weight.humanas,
          weight_natureza: uni.weight.natureza,
          weight_matematica: uni.weight.matematica,
          weight_redacao: uni.weight.redacao,
          last_update: uni.lastUpdate
        })),
        { onConflict: 'name,course_id' }
      );

    if (universitiesError) {
      console.error('Error saving universities:', universitiesError);
      return;
    }

    console.log('Database population completed successfully!');
  } catch (error) {
    console.error('Failed to populate database:', error);
  }
}

populateDatabase();
