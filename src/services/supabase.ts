import { createClient } from '@supabase/supabase-js';
import type { UniversityData } from './sisuApi';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  }
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      await sleep(delay);
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function saveUniversities(universities: UniversityData[]) {
  try {
    const { error } = await retryOperation(() => 
      supabase
        .from('universities')
        .upsert(
          universities.map(uni => ({
            name: uni.name,
            short_name: uni.shortName,
            state: uni.state,
            city: uni.city,
            min_score: uni.minScore,
            weight_linguagens: uni.weight.linguagens,
            weight_humanas: uni.weight.humanas,
            weight_natureza: uni.weight.natureza,
            weight_matematica: uni.weight.matematica,
            weight_redacao: uni.weight.redacao,
            last_update: uni.lastUpdate
          })),
          { onConflict: 'name' }
        )
    );

    if (error) {
      console.error('Error saving universities:', error);
      if (error.code === '42P01') {
        throw new Error('Table does not exist. Please run the database.sql migration first.');
      }
      if (error.code === '23505') {
        throw new Error('Duplicate university names found. Please ensure all names are unique.');
      }
      throw new Error(`Failed to save data: ${error.message}`);
    }
  } catch (error) {
    console.error('Failed to save universities:', error);
    throw error;
  }
}

export async function getUniversities(): Promise<UniversityData[]> {
  try {
    const { data, error } = await retryOperation(() =>
      supabase
        .from('universities')
        .select('*')
        .order('state')
    );

    if (error) {
      console.error('Error fetching universities:', error);
      throw new Error(`Failed to load data: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map(uni => ({
      name: uni.name,
      shortName: uni.short_name,
      state: uni.state,
      city: uni.city,
      minScore: uni.min_score,
      weight: {
        linguagens: uni.weight_linguagens,
        humanas: uni.weight_humanas,
        natureza: uni.weight_natureza,
        matematica: uni.weight_matematica,
        redacao: uni.weight_redacao
      },
      lastUpdate: uni.last_update
    }));
  } catch (error) {
    console.error('Failed to fetch universities:', error);
    throw error;
  }
}