import { useState, useEffect } from 'react';
import { Calculator, MapPin, School, Loader2, RefreshCw } from 'lucide-react';
import { UniversityData } from './services/sisuApi';
import { getUniversities } from './services/supabase';

// Type for scores
type Scores = {
  linguagens: number | '';
  humanas: number | '';
  natureza: number | '';
  matematica: number | '';
  redacao: number | '';
};

// Get saved scores from localStorage
const getSavedScores = (): Scores => {
  const saved = localStorage.getItem('userScores');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing saved scores:', e);
    }
  }
  return {
    linguagens: '',
    humanas: '',
    natureza: '',
    matematica: '',
    redacao: ''
  };
};

function App() {
  const [scores, setScores] = useState<Scores>(getSavedScores());
  const [isScoresVisible, setIsScoresVisible] = useState(true);
  const [isStatesVisible, setIsStatesVisible] = useState(true);

  const [preferredStates, setPreferredStates] = useState<string[]>(() => {
    const saved = localStorage.getItem('preferredStates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved states:', e);
        return [];
      }
    }
    return [];
  });

  const [universities, setUniversities] = useState<UniversityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    fetchUniversities();
  }, [retryCount]);

  // Save scores to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userScores', JSON.stringify(scores));
  }, [scores]);

  // Save preferred states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('preferredStates', JSON.stringify(preferredStates));
  }, [preferredStates]);

  const fetchUniversities = async () => {
    try {
      const data = await getUniversities();
      setUniversities(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao carregar dados: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchUniversities();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao atualizar dados: ${message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(count => count + 1);
  };

  const handleScoreChange = (field: keyof Scores, value: string) => {
    if (value === '') {
      setScores(prev => ({ ...prev, [field]: '' }));
      return;
    }
    // Round to 1 decimal place and ensure it's within bounds
    const numValue = Math.min(1000, Math.max(0, Math.round(Number(value) * 10) / 10));
    setScores(prev => ({ ...prev, [field]: numValue }));
  };

  const togglePreferredState = (state: string) => {
    setPreferredStates(prev => 
      prev.includes(state)
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const calculateWeightedScore = (university: UniversityData) => {
    // Check if any score is empty
    const hasEmptyScores = Object.values(scores).some(score => score === '');
    if (hasEmptyScores) {
      return '-';
    }

    const weightSum = Object.values(university.weight).reduce((a, b) => a + b, 0);
    
    const weightedSum = 
      Number(scores.linguagens) * university.weight.linguagens +
      Number(scores.humanas) * university.weight.humanas +
      Number(scores.natureza) * university.weight.natureza +
      Number(scores.matematica) * university.weight.matematica +
      Number(scores.redacao) * university.weight.redacao;
    
    return (weightedSum / weightSum).toFixed(2);
  };

  const sortedUniversities = [...universities].sort((a, b) => {
    const aScore = calculateWeightedScore(a);
    const bScore = calculateWeightedScore(b);
    const aPassed = aScore !== '-' && Number(aScore) >= a.minScore;
    const bPassed = bScore !== '-' && Number(bScore) >= b.minScore;
    
    // First sort by approval status
    if (aPassed && !bPassed) return -1;
    if (!aPassed && bPassed) return 1;
    
    // Then sort by delta (difference between calculated score and min score)
    if (aScore !== '-' && bScore !== '-') {
      const aDelta = Number(aScore) - a.minScore;
      const bDelta = Number(bScore) - b.minScore;
      return bDelta - aDelta;
    }
    
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <School className="w-8 h-8" />
              <h1 className="text-2xl font-bold">SISU Bruno Medicina</h1>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <button 
                  onClick={() => setIsScoresVisible(prev => !prev)}
                  className={`px-4 py-2 rounded-lg transition-colors ${isScoresVisible ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'}`}
                >
                  Minhas notas
                </button>
                {isScoresVisible && (
                  <>
                    <div 
                      className="fixed inset-0 bg-transparent" 
                      onClick={() => setIsScoresVisible(false)}
                    />
                    <div className="absolute right-0 z-10 mt-2 w-96 bg-white rounded-lg shadow-lg p-6 text-gray-900">
                      <div className="space-y-4">
                        {Object.entries(scores).map(([field, value]) => (
                          <div key={field}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.charAt(0).toUpperCase() + field.slice(1)}
                            </label>
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => handleScoreChange(field as keyof Scores, e.target.value)}
                              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                              max="1000"
                              step="0.1"
                              placeholder="Digite sua nota aqui"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setIsStatesVisible(prev => !prev)}
                  className={`px-4 py-2 rounded-lg transition-colors ${isStatesVisible ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'}`}
                >
                  Estados preferidos
                </button>
                {isStatesVisible && (
                  <>
                    <div 
                      className="fixed inset-0 bg-transparent" 
                      onClick={() => setIsStatesVisible(false)}
                    />
                    <div className="absolute right-0 z-10 mt-2 w-96 bg-white rounded-lg shadow-lg p-6">
                      <div className="grid grid-cols-4 gap-2">
                        {ESTADOS_BR.map(state => (
                          <button
                            key={state}
                            onClick={() => togglePreferredState(state)}
                            className={`p-2 rounded text-sm font-medium transition-colors
                              ${preferredStates.includes(state)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {state}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4">
        <section className="mt-4 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Resultado por Universidade</h2>
          
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Carregando dados do SISU...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 text-red-700 rounded flex flex-col items-center">
              <p className="text-center mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Universidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nota de Corte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sua Nota
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedUniversities.map((uni) => {
                    const calculatedScore = calculateWeightedScore(uni);
                    const passed = calculatedScore !== '-' && Number(calculatedScore) >= uni.minScore;
                    const isPreferred = preferredStates.includes(uni.state);
                    
                    return (
                      <tr key={`${uni.shortName}-${uni.city}`} className={isPreferred ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{uni.shortName}</div>
                            <div className="text-sm text-gray-500">{uni.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{uni.state}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{uni.city}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{uni.minScore.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{calculatedScore}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {calculatedScore !== '-' ? (
                            <span className={Number(calculatedScore) >= uni.minScore ? 'text-green-600' : 'text-red-600'}>
                              {(Number(calculatedScore) - uni.minScore).toFixed(2)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {passed ? 'Aprovado' : 'Reprovado'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;