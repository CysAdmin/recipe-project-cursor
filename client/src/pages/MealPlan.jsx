import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { mealSchedules as scheduleApi } from '../api/client';
import { recipes as recipesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

function toYMD(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function DraggableRecipe({ id, recipe, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${id}`,
    data: { type: 'recipe', recipeId: id, recipe },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing rounded-xl border border-slate-700 bg-slate-800 overflow-hidden transition-opacity ${isDragging ? 'opacity-50' : 'hover:border-slate-600'}`}
    >
      {children}
    </div>
  );
}

function DroppableDay({ date, children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${date}`,
    data: { date },
  });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver ? 'border-brand-500 bg-brand-500/10' : 'border-slate-700 bg-slate-800/30'
      }`}
    >
      {children}
    </div>
  );
}

const localeForLanguage = (lng) => (lng === 'de' ? 'de-DE' : 'en-US');

export default function MealPlan() {
  const { t, i18n } = useTranslation();
  const dateLocale = localeForLanguage(i18n.language);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });
  const [recipeSearch, setRecipeSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState(null);
  const queryClient = useQueryClient();

  const startStr = toYMD(weekStart);
  const endDate = addDays(weekStart, 6);
  const endStr = toYMD(endDate);

  const { data: schedulesData } = useQuery({
    queryKey: ['meal-schedules', startStr, endStr],
    queryFn: () => scheduleApi.list(startStr, endStr),
  });

  const { user } = useAuth();
  const { data: myRecipesData } = useQuery({
    queryKey: ['recipes', 'mine', user?.id, recipeSearch.trim() || null, favoritesOnly],
    queryFn: () => recipesApi.list({
      mine: '1',
      ...(recipeSearch.trim() && { q: recipeSearch.trim() }),
      ...(favoritesOnly && { favorites: '1' }),
    }),
    enabled: !!user?.id,
  });

  const addMutation = useMutation({
    mutationFn: (body) => scheduleApi.add(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-schedules'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => scheduleApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-schedules'] });
    },
  });

  const schedules = schedulesData?.schedules || [];
  const myRecipes = myRecipesData?.recipes || [];

  const byDay = useMemo(() => {
    const map = {};
    schedules.forEach((s) => {
      const key = s.meal_date;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    return map;
  }, [schedules]);

  const weekDates = getWeekDates(weekStart);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === 'recipe') setActiveRecipe(data.recipe);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveRecipe(null);
    if (!over?.data?.current) return;
    const recipeData = active.data.current;
    const slotData = over.data.current;
    if (recipeData?.type === 'recipe' && slotData?.date) {
      addMutation.mutate({
        recipe_id: recipeData.recipeId,
        meal_date: slotData.date,
        servings: recipeData.recipe?.servings ?? 1,
      });
    }
  };

  const goPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setWeekStart((d) => addDays(d, 7));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">{t('mealPlan.title')}</h1>
        <p className="text-slate-400 mb-6">{t('mealPlan.subline')}</p>

        {/* Rezeptsuche oben, volle Breite */}
        <section className="mb-8 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <label htmlFor="meal-plan-recipe-search" className="block text-slate-400 text-sm font-medium mb-3">
            {t('mealPlan.searchPick')}
          </label>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              id="meal-plan-recipe-search"
              type="search"
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              placeholder={t('mealPlan.placeholderSearch')}
              className="flex-1 min-w-[200px] px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <span className="relative inline-flex h-6 w-10 shrink-0 rounded-full bg-slate-700 transition-colors has-[:checked]:bg-brand-500">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
              <span className="text-slate-300 text-sm font-medium">{t('mealPlan.favoritesOnly')}</span>
            </label>
          </div>
          <div className="min-h-[140px] max-h-[220px] overflow-y-auto overflow-x-hidden">
            {myRecipes.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">
                {recipeSearch.trim()
                  ? t('mealPlan.noMatch')
                  : favoritesOnly
                    ? t('mealPlan.noFavorites')
                    : <><Link to="/app/recipes" className="text-brand-400 hover:underline">{t('mealPlan.addRecipes')}</Link> {t('mealPlan.addRecipesToDrag')}</>
                }
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {myRecipes.slice(0, 12).map((r) => (
                  <DraggableRecipe key={r.id} id={r.id} recipe={r}>
                    <div className="flex gap-3 p-3">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0 bg-slate-700"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-700 shrink-0 flex items-center justify-center text-slate-500 text-xs">
                          {t('mealPlan.noImg')}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-white font-medium text-sm">{r.title}</span>
                        {r.servings != null && (
                          <span className="text-slate-500 text-xs">{r.servings} {t('recipeDetail.servings')}</span>
                        )}
                      </div>
                    </div>
                  </DraggableRecipe>
                  ))}
                </div>
                {myRecipes.length > 12 && (
                  <p className="text-slate-500 text-sm mt-2">
                    {t('mealPlan.showingN', { count: myRecipes.length })}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Kalender darunter */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevWeek}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {t('mealPlan.previous')}
            </button>
            <button
              type="button"
              onClick={goNextWeek}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {t('mealPlan.next')}
            </button>
          </div>
          <span className="text-slate-500 text-sm">
            {weekDates[0].toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
            {weekDates[6].toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Link
            to="/app/shopping-list"
            className="ml-auto px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600"
          >
            {t('mealPlan.generateList')}
          </Link>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 min-w-[560px]">
            {weekDates.map((d) => {
              const dateStr = toYMD(d);
              const dayItems = byDay[dateStr] || [];
              return (
                <div key={dateStr} className="flex flex-col">
                  <div className="text-center text-slate-500 text-sm font-medium p-2 mb-1">
                    {d.toLocaleDateString(dateLocale, { weekday: 'short' })}
                    <br />
                    <span className="text-slate-600">{d.getDate()}</span>
                  </div>
                  <DroppableDay date={dateStr}>
                    {dayItems.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-1 mb-1 rounded bg-slate-700/50 px-2 py-1 text-sm"
                      >
                        <Link
                          to={`/app/recipes/${s.recipe_id}`}
                          className="truncate text-brand-300 hover:underline flex-1"
                        >
                          {s.recipe_title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(s.id)}
                          className="text-slate-500 hover:text-red-400 shrink-0"
                          title={t('common.remove')}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </DroppableDay>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-slate-500 text-sm">
          {t('mealPlan.dragHint')}{' '}
          <Link to="/app/shopping-list" className="text-brand-400 hover:underline">{t('nav.shoppingList')}</Link> {t('mealPlan.shoppingListUses')}
        </p>
      </div>

      <DragOverlay>
        {activeRecipe ? (
          <div className="rounded-xl border border-brand-500 bg-slate-800 shadow-lg overflow-hidden flex gap-3 p-3 max-w-[280px]">
            {activeRecipe.image_url ? (
              <img
                src={activeRecipe.image_url}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-700 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="block truncate text-white font-medium">{activeRecipe.title}</span>
              {activeRecipe.servings != null && (
                <span className="text-slate-500 text-xs">{activeRecipe.servings} {t('recipeDetail.servings')}</span>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
