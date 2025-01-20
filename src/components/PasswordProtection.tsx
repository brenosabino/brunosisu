import { useState } from 'react';

interface PasswordProtectionProps {
  onAuthenticate: () => void;
  correctPassword: string;
}

export function PasswordProtection({ onAuthenticate, correctPassword }: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      onAuthenticate();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-6 shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-blue-900">Área Protegida</h2>
          <p className="mt-2 text-sm text-blue-800">
            Digite a senha para acessar o site
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="sr-only">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-lg border ${
                error ? 'border-red-500' : 'border-gray-300'
              } bg-white px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="Digite a senha"
            />
            {error && (
              <p className="text-sm text-red-600">Senha incorreta. Tente novamente.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
