import { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MessageCircle, Send, X } from 'lucide-react';
import { ChatMessage, getChatResponse } from '../services/gemini';

interface ChatBotProps {
  universities: any[];
  scores?: {
    linguagens: number;
    humanas: number;
    natureza: number;
    matematica: number;
    redacao: number;
  };
}

export function ChatBot({ universities, scores }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatMessage = (content: string) => {
    let formattedContent = content;

    // Format university listings with scores (approved/almost approved)
    formattedContent = formattedContent.replace(
      /(Você está (?:aprovado|quase aprovado)[^:]*:)((?:\s*\*[^\n]*\n*)*)/g,
      (_, title, universities) => {
        const formattedUniversities = universities
          .trim()
          .split('\n')
          .map((uni: string) => {
            const [name, scores] = uni.replace('* ', '').split(' - ');
            if (!scores) return `<div class="university-item">${name}</div>`;
            return `
              <div class="university-item">
                <div class="university-name">${name}</div>
                <div class="university-scores">${scores}</div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="universities-section">
            <div class="universities-title">${title}</div>
            <div class="universities-list">
              ${formattedUniversities}
            </div>
          </div>
        `;
      }
    );

    // Format initial approval message
    formattedContent = formattedContent.replace(
      /(Bom dia|Olá)![^!]*![^!]*![^:]*:((?:\s*\*[^\n]*\n*)*)((?:Essas|Parabéns)[^!]*!)\s*(.*)/,
      (_, greeting, universities, congrats, help) => {
        const formattedUniversities = universities
          .trim()
          .split('\n')
          .map((uni: string) => {
            const [name, campus] = uni.replace('* ', '').split(' (');
            return `
              <div class="university-approval-item">
                <div class="university-campus">${campus ? `${campus.replace(')', '')}` : ''}</div>
                <div class="university-name">${name}</div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="approval-message">
            <div class="greeting-section">
              <div class="greeting-emoji">🎓</div>
              <div class="greeting-text">
                <div class="greeting">${greeting}!</div>
                <div class="approval-count">Você foi aprovado em 16 universidades para Medicina!</div>
              </div>
            </div>
            
            <div class="universities-section">
              <div class="universities-intro">Suas aprovações:</div>
              <div class="universities-grid">
                ${formattedUniversities}
              </div>
            </div>
            
            <div class="footer-section">
              <div class="congrats">${congrats}</div>
              <div class="help-text">${help}</div>
            </div>
          </div>
        `;
      }
    );

    // Format city recommendations with rankings
    formattedContent = formattedContent.replace(
      /(Das cidades[^:]*:)((?:\s*\d+\.\s*[^\n]*\n*)*)/g,
      (_, intro, cities) => {
        const formattedCities = cities
          .trim()
          .split('\n')
          .map((city: string) => {
            const [rank, cityInfo] = city.split('. ');
            const [cityName, university] = cityInfo.split(' (');
            return `
              <div class="recommended-city-item">
                <div class="city-rank">${rank}</div>
                <div class="city-details">
                  <div class="city-name">${cityName}</div>
                  ${university ? `<div class="city-university">(${university}</div>` : ''}
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="city-recommendations">
            <div class="recommendations-intro">${intro}</div>
            <div class="recommended-cities-list">
              ${formattedCities}
            </div>
          </div>
        `;
      }
    );

    // Format city listings
    formattedContent = formattedContent.replace(
      /(As cidades das universidades[^:]*:)((?:\s*\*[^\n]*(?:\([^\)]+\))[^\n]*\n*)*)/g,
      (_, title, cities) => {
        const formattedCities = cities
          .trim()
          .split('\n')
          .map((city: string) => {
            const [cityName, university] = city.replace('* ', '').split(' (');
            if (!university) return `<div class="city-item">${cityName}</div>`;
            return `
              <div class="city-item">
                <div class="city-name">${cityName}</div>
                <div class="city-university">(${university}</div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="cities-section">
            <div class="cities-title">${title}</div>
            <div class="cities-grid">
              ${formattedCities}
            </div>
          </div>
        `;
      }
    );

    // Format general lists with descriptions
    formattedContent = formattedContent.replace(
      /\* \*\*(.*?)\*\*: (.*?)(?=\n\*|\n\n|$)/g,
      (_, title, description) => `
        <div class="list-item">
          <div class="list-item-title">${title}</div>
          <div class="list-item-description">${description}</div>
        </div>
      `
    );

    // Format bold text outside of lists
    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Format IDH comparison
    formattedContent = formattedContent.replace(
      /(Comparação do IDH[^:]*:)((?:\s*\*[^\n]*\n*)*)/g,
      (_, intro, cities) => {
        const formattedCities = cities
          .trim()
          .split('\n')
          .map((city: string) => {
            const [cityName, idh] = city.replace('* ', '').split(' - ');
            return `
              <div class="idh-city-item">
                <div class="idh-city-name">${cityName}</div>
                <div class="idh-details">
                  <div class="idh-value">${idh}</div>
                  <div class="idh-level ${parseFloat(idh) >= 0.7 ? 'alto' : 'médio'}">${parseFloat(idh) >= 0.7 ? 'Alto' : 'Médio'}</div>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="idh-comparison">
            <div class="idh-intro">${intro}</div>
            <div class="idh-cities-grid">
              ${formattedCities}
            </div>
            <div class="idh-conclusion">A cidade com o maior IDH é a mais desenvolvida.</div>
            <div class="idh-help">O IDH é um índice que mede o desenvolvimento humano de uma cidade.</div>
          </div>
        `;
      }
    );

    // Format university details
    formattedContent = formattedContent.replace(
      /(Detalhes da universidade[^:]*:)((?:\s*\*[^\n]*\n*)*)/g,
      (_, intro, details) => {
        const formattedDetails = details
          .trim()
          .split('\n')
          .map((detail: string) => {
            const [title, content] = detail.replace('* ', '').split(' - ');
            return `
              <div class="uni-detail-item">
                <div class="detail-title">${title}</div>
                <div class="detail-content">${content}</div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="university-details">
            <div class="uni-header">
              <div class="uni-intro">${intro}</div>
              <div class="uni-name">Universidade</div>
            </div>
            <div class="details-section">
              ${formattedDetails}
            </div>
            <div class="next-steps-section">
              <div class="steps-title">Próximos passos</div>
              <div class="steps-list">
                <div class="next-step-item">
                  <div class="step-content">Verifique os requisitos de ingresso.</div>
                </div>
                <div class="next-step-item">
                  <div class="step-content">Faça a inscrição no vestibular.</div>
                </div>
              </div>
            </div>
            <div class="uni-conclusion">Boa sorte!</div>
          </div>
        `;
      }
    );

    // Format sections with headers
    formattedContent = formattedContent.replace(
      /\[([A-Z_]+)\]((?:\n[^[]*(?=\[|$))*)/g,
      (_, header, content) => `
        <div class="content-section">
          <div class="section-header">${header.replace(/_/g, ' ')}</div>
          <div class="section-content">${content}</div>
        </div>
      `
    );

    // Format bullet points with details
    formattedContent = formattedContent.replace(
      /^[•\-]\s*(.+?)(?::\s*|\n\s+)((?:(?!^[•\-]).)*)/gm,
      (_, title, details) => `
        <div class="bullet-item">
          <div class="bullet-title">${title}</div>
          ${details ? `<div class="bullet-details">${details}</div>` : ''}
        </div>
      `
    );

    // Format state headers
    formattedContent = formattedContent.replace(
      /\[([A-Z]+(?:\s+[A-Z]+)*)\]/g,
      '<div class="state-header">$1</div>'
    );

    // Format nested items
    formattedContent = formattedContent.replace(
      /^(\s*)-\s*(.+?)(?::\s*|\n\s+)((?:(?!^[•\-]).)*)/gm,
      (_, indent, title, details) => `
        <div class="nested-item" style="margin-left: ${indent.length * 8}px">
          <div class="nested-title">${title}</div>
          ${details ? `<div class="nested-details">${details}</div>` : ''}
        </div>
      `
    );

    // Add styles
    const additionalStyles = `
      [&_.content-section]:mb-6 [&_.content-section]:last:mb-0
      [&_.section-header]:text-lg [&_.section-header]:font-bold [&_.section-header]:text-blue-900 [&_.section-header]:mb-3
      [&_.section-content]:space-y-2
      [&_.bullet-item]:bg-white/50 [&_.bullet-item]:p-3 [&_.bullet-item]:rounded-lg [&_.bullet-item]:mb-2
      [&_.bullet-title]:font-medium [&_.bullet-title]:text-blue-900
      [&_.bullet-details]:text-blue-800 [&_.bullet-details]:mt-1
      [&_.state-header]:text-xl [&_.state-header]:font-bold [&_.state-header]:text-blue-900 [&_.state-header]:mt-4 [&_.state-header]:mb-2
      [&_.nested-item]:bg-white/30 [&_.nested-item]:p-2 [&_.nested-item]:rounded [&_.nested-item]:mb-1
      [&_.nested-title]:font-medium [&_.nested-title]:text-blue-800
      [&_.nested-details]:text-blue-700 [&_.nested-details]:text-sm [&_.nested-details]:mt-1
    `;

    // Format initial approval message
    formattedContent = formattedContent.replace(
      /(Bom dia|Olá)![^!]*![^!]*![^:]*:((?:\s*\*[^\n]*\n*)*)((?:Essas|Parabéns)[^!]*!)\s*(.*)/,
      (_, greeting, universities, congrats, help) => {
        const formattedUniversities = universities
          .trim()
          .split('\n')
          .map((uni: string) => {
            const [name, campus] = uni.replace('* ', '').split(' (');
            return `
              <div class="university-approval-item">
                <div class="university-campus">${campus ? `${campus.replace(')', '')}` : ''}</div>
                <div class="university-name">${name}</div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="approval-message">
            <div class="greeting-section">
              <div class="greeting-emoji">🎓</div>
              <div class="greeting-text">
                <div class="greeting">${greeting}!</div>
                <div class="approval-count">Você foi aprovado em 16 universidades para Medicina!</div>
              </div>
            </div>
            
            <div class="universities-section">
              <div class="universities-intro">Suas aprovações:</div>
              <div class="universities-grid">
                ${formattedUniversities}
              </div>
            </div>
            
            <div class="footer-section">
              <div class="congrats">${congrats}</div>
              <div class="help-text">${help}</div>
            </div>
          </div>
        `;
      }
    );

    return formattedContent;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await getChatResponse([...messages, userMessage], universities, scores);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root onOpenChange={(open) => {
      if (open) {
        // Use setTimeout to ensure the input is mounted before focusing
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }}>
      <Dialog.Trigger asChild>
        <button className="fixed bottom-4 right-4 p-4 bg-blue-500 text-white rounded-full hover:bg-blue-400 transition-colors">
          <MessageCircle className="w-6 h-6" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed bottom-4 right-4 w-[90vw] max-w-[400px] h-[600px] bg-white rounded-lg shadow-xl flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-bold">Assistente SISU</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="text-gray-500 text-center">
                Olá! Eu sou o assistente do SISU. Como posso te ajudar hoje?
              </div>
            )}
            {messages.map((message: ChatMessage, index: number) => (
              <div
              key={index}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-gray-100 text-gray-900'
              } max-w-[80%] ${message.role === 'assistant' ? 'chat-message' : ''}`}
              >
              {message.role === 'assistant' ? (
                <div 
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                className="[&_.universities-section]:mb-4 
                  [&_.universities-title]:font-semibold [&_.universities-title]:mb-2 
                  [&_.universities-list]:space-y-2
                  [&_.university-item]:p-2 [&_.university-item]:bg-white/50 [&_.university-item]:rounded
                  [&_.university-name]:font-medium [&_.university-name]:text-blue-900
                  [&_.university-scores]:text-sm [&_.university-scores]:text-blue-800
                  [&_.university-item]:hover:bg-white/80 [&_.university-item]:transition-colors
                  [&_.cities-section]:mb-4
                  [&_.cities-title]:font-semibold [&_.cities-title]:mb-3
                  [&_.cities-grid]:grid [&_.cities-grid]:grid-cols-2 [&_.cities-grid]:gap-2
                  [&_.city-item]:p-2 [&_.city-item]:bg-white/50 [&_.city-item]:rounded [&_.city-item]:flex [&_.city-item]:flex-col
                  [&_.city-name]:font-medium [&_.city-name]:text-blue-900
                  [&_.city-university]:text-sm [&_.city-university]:text-blue-800
                  [&_.city-item]:hover:bg-white/80 [&_.city-item]:transition-colors
                  [&_.list-item]:mb-3 [&_.list-item]:p-2 [&_.list-item]:bg-white/50 [&_.list-item]:rounded
                  [&_.list-item-title]:font-semibold [&_.list-item-title]:text-blue-900
                  [&_.list-item-description]:text-sm [&_.list-item-description]:text-gray-700 [&_.list-item-description]:mt-1
                  [&_strong]:font-semibold [&_strong]:text-blue-900
                  [&_.city-recommendations]:mb-4
                  [&_.recommendations-intro]:font-semibold [&_.recommendations-intro]:mb-2
                  [&_.recommended-cities-list]:space-y-2
                  [&_.recommended-city-item]:p-2 [&_.recommended-city-item]:bg-white/50 [&_.recommended-city-item]:rounded
                  [&_.city-rank]:font-medium [&_.city-rank]:text-blue-900
                  [&_.city-details]:flex [&_.city-details]:flex-col
                  [&_.city-name]:font-medium [&_.city-name]:text-blue-900
                  [&_.city-university]:text-sm [&_.city-university]:text-blue-800
                  [&_.recommended-city-item]:hover:bg-white/80 [&_.recommended-city-item]:transition-colors
                  [&_.approval-message]:space-y-8
                  [&_.greeting-section]:flex [&_.greeting-section]:items-center [&_.greeting-section]:gap-4
                  [&_.greeting-emoji]:text-4xl
                  [&_.greeting-text]:space-y-1
                  [&_.greeting]:text-2xl [&_.greeting]:font-bold [&_.greeting]:text-blue-900
                  [&_.approval-count]:text-lg [&_.approval-count]:text-blue-800 [&_.approval-count]:font-medium
                  [&_.universities-section]:space-y-4
                  [&_.universities-intro]:text-xl [&_.universities-intro]:font-semibold [&_.universities-intro]:text-blue-900
                  [&_.universities-grid]:grid [&_.universities-grid]:grid-cols-1 [&_.universities-grid]:md:grid-cols-2 [&_.universities-grid]:gap-3
                  [&_.university-approval-item]:p-4 [&_.university-approval-item]:bg-white/50 [&_.university-approval-item]:rounded-lg 
                  [&_.university-approval-item]:transition-all [&_.university-approval-item]:space-y-1
                  [&_.university-approval-item]:hover:bg-white/80 [&_.university-approval-item]:hover:shadow-md [&_.university-approval-item]:hover:scale-[1.02]
                  [&_.university-name]:font-semibold [&_.university-name]:text-blue-900
                  [&_.university-campus]:text-sm [&_.university-campus]:text-blue-700 [&_.university-campus]:font-medium
                  [&_.footer-section]:space-y-2 [&_.footer-section]:border-t [&_.footer-section]:border-blue-100 [&_.footer-section]:pt-4
                  [&_.congrats]:text-lg [&_.congrats]:font-medium [&_.congrats]:text-blue-900
                  [&_.help-text]:text-blue-800
                  [&_.idh-comparison]:space-y-6
                  [&_.idh-intro]:text-lg [&_.idh-intro]:text-blue-900
                  [&_.idh-cities-grid]:grid [&_.idh-cities-grid]:grid-cols-1 [&_.idh-cities-grid]:md:grid-cols-2 [&_.idh-cities-grid]:gap-4
                  [&_.idh-city-item]:bg-white/50 [&_.idh-city-item]:p-4 [&_.idh-city-item]:rounded-lg [&_.idh-city-item]:flex [&_.idh-city-item]:justify-between [&_.idh-city-item]:items-center
                  [&_.idh-city-name]:font-semibold [&_.idh-city-name]:text-blue-900
                  [&_.idh-details]:text-right
                  [&_.idh-value]:font-medium [&_.idh-value]:text-blue-800
                  [&_.idh-level]:text-sm [&_.idh-level]:px-2 [&_.idh-level]:py-1 [&_.idh-level]:rounded
                  [&_.idh-level.alto]:bg-green-100 [&_.idh-level.alto]:text-green-800
                  [&_.idh-level.médio]:bg-yellow-100 [&_.idh-level.médio]:text-yellow-800"
                />
              ) : (
                message.content
              )}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 text-gray-900 p-3 rounded-lg max-w-[80%]">
              Digitando...
              </div>
            )}
            </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 disabled:bg-blue-300 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
