import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Scores {
  linguagens: number;
  humanas: number;
  natureza: number;
  matematica: number;
  redacao: number;
}

function calculateWeightedScore(scores: Scores, weights: Scores): number {
  const total =
    scores.linguagens * weights.linguagens +
    scores.humanas * weights.humanas +
    scores.natureza * weights.natureza +
    scores.matematica * weights.matematica +
    scores.redacao * weights.redacao;

  const weightSum =
    weights.linguagens +
    weights.humanas +
    weights.natureza +
    weights.matematica +
    weights.redacao;

  return total / weightSum;
}

function getApprovedUniversities(universities: any[], scores: Scores) {
  return universities
    .map(uni => {
      const weightedScore = calculateWeightedScore(scores, uni.weight);
      return {
        ...uni,
        weightedScore,
        approved: weightedScore >= uni.minScore
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

export async function getChatResponse(
  messages: ChatMessage[],
  universities: any[],
  scores?: Scores
) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    let approvalInfo = '';
    if (scores) {
      const analyzedUniversities = getApprovedUniversities(universities, scores);
      const approved = analyzedUniversities.filter(uni => uni.approved);
      const almostApproved = analyzedUniversities
        .filter(uni => !uni.approved && uni.weightedScore >= uni.minScore - 20)
        .slice(0, 5);

      approvalInfo = `
Based on the user's current scores:
- Linguagens: ${scores.linguagens}
- Humanas: ${scores.humanas}
- Natureza: ${scores.natureza}
- Matemática: ${scores.matematica}
- Redação: ${scores.redacao}

Current approval status:
- Approved for ${approved.length} universities
${approved
  .map(
    uni =>
      `  * ${uni.name} (${uni.shortName}) - Your score: ${uni.weightedScore.toFixed(
        2
      )} (Cutoff: ${uni.minScore})`
  )
  .join('\n')}

Almost approved (within 20 points):
${almostApproved
  .map(
    uni =>
      `  * ${uni.name} (${uni.shortName}) - Your score: ${uni.weightedScore.toFixed(
        2
      )} (Cutoff: ${uni.minScore})`
  )
  .join('\n')}`;
    }

    const prompt = `You are a helpful assistant that helps students understand medicine course data in Brazil. 
    ${
      scores
        ? "You have access to the student's current scores and approval status."
        : 'The student has not provided their scores yet.'
    }

    ${approvalInfo}

    Important instructions:
    1. When discussing universities or cities, ONLY mention those where the student is actually approved (weightedScore >= minScore).
    2. DO NOT mention universities or cities where the student is not yet approved.
    3. If asked about "best cities" or "quality of life", only consider cities from approved universities.
    4. Always check the approval status before making recommendations.
    5. Format lists clearly with proper spacing and organization.

    Previous conversation:
    ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

    Please provide a helpful response to the user's question. Focus on being clear and concise.
    If asked about specific scores or universities, use the data provided.
    If asked about general advice or the admission process, provide helpful guidance.
    Always be friendly and supportive.
    Respond in Portuguese.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error('Error getting chat response:', error);
    throw error;
  }
}
