import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

export default function AdminUserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => admin.users.get(id),
    enabled: !isNew,
  });

  useEffect(() => {
    if (data?.user) {
      setEmail(data.user.email);
      setDisplayName(data.user.display_name || '');
      setIsAdmin(!!data.user.is_admin);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body) => (isNew ? admin.users.create(body) : admin.users.update(id, body)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      navigate('/app/admin/users');
    },
    onError: (err) => setError(err.data?.error || err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (isNew) {
      if (!password.trim()) {
        setError('Passwort ist erforderlich.');
        return;
      }
      saveMutation.mutate({ email: email.trim(), password, display_name: displayName.trim() || null, is_admin: isAdmin });
    } else {
      const body = { email: email.trim(), display_name: displayName.trim() || null, is_admin: isAdmin };
      if (password.trim()) body.new_password = password;
      saveMutation.mutate(body);
    }
  };

  if (!isNew && isLoading) return <p className="text-slate-400">Laden…</p>;

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-white">{isNew ? 'Benutzer anlegen' : 'Benutzer bearbeiten'}</h2>
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Anzeigename</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            Passwort {isNew ? '' : '(leer lassen = unverändert)'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            required={isNew}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_admin"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-brand-500"
          />
          <label htmlFor="is_admin" className="text-sm text-slate-300">Admin</label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/admin/users')}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
