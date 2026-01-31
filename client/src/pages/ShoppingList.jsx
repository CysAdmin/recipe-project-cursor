import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { shoppingLists as listApi } from '../api/client';

function toYMD(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

export default function ShoppingList() {
  const [startDate, setStartDate] = useState(() => toYMD(getWeekStart(new Date())));
  const [endDate, setEndDate] = useState(() => toYMD(addDays(getWeekStart(new Date()), 6)));

  const { data, isLoading, error } = useQuery({
    queryKey: ['shopping-list', 'generate', startDate, endDate],
    queryFn: () => listApi.generate(startDate, endDate),
  });

  const items = data?.items || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white mb-2">Shopping List</h1>
      <p className="text-slate-400 mb-6">
        Generated from recipes scheduled in your meal plan for the selected date range.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label htmlFor="start" className="block text-sm font-medium text-slate-400 mb-1">
            Start date
          </label>
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="end" className="block text-sm font-medium text-slate-400 mb-1">
            End date
          </label>
          <input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Print list
        </button>
        <Link
          to="/app/meal-plan"
          className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600"
        >
          Edit meal plan
        </Link>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Generating list…</p>
      ) : error ? (
        <p className="text-red-400">Failed to load shopping list.</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">
          No recipes scheduled for this date range.{' '}
          <Link to="/app/meal-plan" className="text-brand-400 hover:underline">
            Add recipes to your meal plan
          </Link>{' '}
          first.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 print:border-0 print:bg-white print:text-black">
          <h2 className="font-display text-lg font-semibold text-white mb-4 print:text-black">
            Shopping list ({startDate} – {endDate})
          </h2>
          <ul className="space-y-2 list-disc list-inside text-slate-300 print:text-black">
            {items.map((item, i) => (
              <li key={i}>{item.raw}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
