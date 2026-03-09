import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Flag,
  Undo2,
  RotateCcw,
  Eye,
  EyeOff,
  Upload,
  Download,
  PlusCircle,
  Swords,
  Trophy,
  ScanSearch,
  Shield,
  Zap,
  Mountain,
  Trees,
  Waves,
  Hexagon,
  Play,
  Settings,
  Users,
  ScrollText,
  Map as MapIcon,
  Shuffle,
  Crown,
  Radar,
  Sparkles,
} from 'lucide-react';

const TEAM_COLOR_POOL = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#14b8a6', '#84cc16', '#8b5cf6',
  '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#6366f1', '#d946ef', '#0ea5e9', '#65a30d', '#fb7185', '#94a3b8',
];

const TEAM_NAME_POOL = [
  'Красные', 'Синие', 'Зелёные', 'Жёлтые', 'Фиолетовые', 'Оранжевые', 'Розовые', 'Бирюзовые', 'Лаймовые', 'Индиго',
  'Лазурные', 'Янтарные', 'Изумрудные', 'Алые', 'Кобальтовые', 'Неоновые', 'Небесные', 'Оливковые', 'Коралловые', 'Стальные',
];

const TERRAIN_META = {
  plain: { label: 'Равнина', cost: 1, fill: '#1f7a4f', stroke: '#14532d', icon: Hexagon },
  forest: { label: 'Лес', cost: 2, fill: '#14532d', stroke: '#052e16', icon: Trees },
  swamp: { label: 'Болото', cost: 3, fill: '#3f6212', stroke: '#365314', icon: Waves },
  mountain: { label: 'Горы', cost: Infinity, fill: '#475569', stroke: '#1e293b', icon: Mountain },
};

const BONUS_META = {
  energy: { label: 'Энергостанция', icon: Zap, color: '#f59e0b' },
  scanner: { label: 'Сканер', icon: ScanSearch, color: '#06b6d4' },
  boost: { label: 'Форсаж', icon: PlusCircle, color: '#8b5cf6' },
  shield: { label: 'Щит', icon: Shield, color: '#10b981' },
  surprise: { label: 'Сюрприз', icon: Shuffle, color: '#fb7185' },
};

const VIEW_STORAGE_KEY = 'hex-tournament-map-state-v3';

function safeRandomId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function confirmAction(message) {
  if (typeof window === 'undefined') return true;
  return window.confirm(message);
}

function safeLoadState() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

function safeSaveState(state) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {}
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function axialKey(q, r) {
  return `${q},${r}`;
}

function parseKey(key) {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

function getHexPoints(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function hexToPixel(map, q, r, size) {
  if (map?.shape === 'rect') {
    return {
      x: size * Math.sqrt(3) * (q + (r % 2 === 1 ? 0.5 : 0)),
      y: size * (3 / 2) * r,
    };
  }
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * (3 / 2) * r,
  };
}

function hexDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = (-a.q - a.r) - (-b.q - b.r);
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

function rectOffsetToCube(col, row) {
  const x = col - (row - (row & 1)) / 2;
  const z = row;
  const y = -x - z;
  return { x, y, z };
}

function mapDistance(map, a, b) {
  if (map?.shape === 'rect') {
    const ac = rectOffsetToCube(a.q, a.r);
    const bc = rectOffsetToCube(b.q, b.r);
    return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
  }
  return hexDistance(a, b);
}

function neighborsForMap(map, q, r) {
  if (map?.shape === 'rect') {
    const odd = r % 2 === 1;
    return odd
      ? [
          { q: q - 1, r },
          { q: q + 1, r },
          { q, r: r - 1 },
          { q: q + 1, r: r - 1 },
          { q, r: r + 1 },
          { q: q + 1, r: r + 1 },
        ]
      : [
          { q: q - 1, r },
          { q: q + 1, r },
          { q: q - 1, r: r - 1 },
          { q, r: r - 1 },
          { q: q - 1, r: r + 1 },
          { q, r: r + 1 },
        ];
  }
  return [
    { q: q + 1, r },
    { q: q - 1, r },
    { q, r: r + 1 },
    { q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

function createRectMap(cols = 8, rows = 7) {
  const hexes = {};
  for (let r = 0; r < rows; r += 1) {
    for (let q = 0; q < cols; q += 1) {
      hexes[axialKey(q, r)] = {
        q,
        r,
        terrain: 'plain',
        fog: true,
        special: null,
        bonusType: null,
        bonusUsed: false,
        teamBaseId: null,
      };
    }
  }
  return { shape: 'rect', cols, rows, radius: 4, hexes };
}

function createRoundMap(radius = 4) {
  const hexes = {};
  for (let q = -radius; q <= radius; q += 1) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r += 1) {
      hexes[axialKey(q, r)] = {
        q,
        r,
        terrain: 'plain',
        fog: true,
        special: null,
        bonusType: null,
        bonusUsed: false,
        teamBaseId: null,
      };
    }
  }
  return { shape: 'round', cols: 0, rows: 0, radius, hexes };
}

function createInitialTeams(count = 6) {
  return Array.from({ length: Math.max(2, Math.min(20, count)) }, (_, index) => ({
    id: `team-${index + 1}`,
    name: TEAM_NAME_POOL[index] || `Команда ${index + 1}`,
    color: TEAM_COLOR_POOL[index % TEAM_COLOR_POOL.length],
    posKey: null,
    baseKey: null,
    movement: 0,
    score: 0,
    supportTokens: 0,
    activeEffects: {
      boost: false,
      shield: false,
      ignoreSwampOnce: false,
      duelRetry: false,
    },
  }));
}

function getTeamsMissingBases(teams) {
  return teams.filter((team) => !team.baseKey);
}

function revealAround(map, centerKey, radius = 1) {
  if (!centerKey) return;
  const center = parseKey(centerKey);
  Object.values(map.hexes).forEach((hex) => {
    if (mapDistance(map, center, hex) <= radius) {
      map.hexes[axialKey(hex.q, hex.r)].fog = false;
    }
  });
}

function applyDemoStyling(state) {
  const { map } = state;
  const keys = Object.keys(map.hexes);
  keys.forEach((key, index) => {
    const hex = map.hexes[key];
    if ((hex.q + hex.r) % 7 === 0) hex.terrain = 'forest';
    if ((hex.q * 3 + hex.r) % 11 === 0) hex.terrain = 'swamp';
    if ((hex.q * 5 + hex.r) % 13 === 0) hex.terrain = 'mountain';
    if (index % 17 === 0 && hex.terrain !== 'mountain') {
      hex.special = 'bonus';
      const types = Object.keys(BONUS_META);
      hex.bonusType = types[index % types.length];
    }
  });
}

function createDemoState() {
  const map = createRectMap(9, 7);
  const teams = createInitialTeams(6);
  const state = {
    mode: 'host',
    activeTab: 'editor',
    currentRound: 1,
    activeTeamId: teams[0].id,
    phase: 'setup',
    map,
    teams,
    winner: null,
    logs: [],
    settings: {
      showCoords: true,
      showCosts: false,
      showFog: true,
      showBonuses: true,
      showFlag: true,
      revealBonusesThroughFog: false,
      revealFlagThroughFog: false,
      vividGrid: true,
      victoryScore: 15,
    },
    editor: {
      tool: 'terrain',
      terrainType: 'plain',
      bonusType: 'energy',
      teamForBase: teams[0].id,
      roundRadius: 4,
      rectCols: 9,
      rectRows: 7,
      teamCount: 6,
    },
    duel: null,
    duelRetryPrompt: null,
    retreatSelection: null,
    importText: '',
    moveHighlights: [],
    history: [],
  };

  applyDemoStyling(state);

  const assignable = Object.values(map.hexes)
    .filter((hex) => hex.terrain !== 'mountain')
    .sort((a, b) => (a.r - b.r) || (a.q - b.q));

  const demoBases = [
    assignable[0],
    assignable[3],
    assignable[8],
    assignable[assignable.length - 9],
    assignable[assignable.length - 4],
    assignable[assignable.length - 1],
  ];

  teams.forEach((team, i) => {
    const baseHex = demoBases[i];
    if (!baseHex) return;
    const baseKey = axialKey(baseHex.q, baseHex.r);
    team.baseKey = baseKey;
    team.posKey = baseKey;
    map.hexes[baseKey].special = 'base';
    map.hexes[baseKey].teamBaseId = team.id;
    revealAround(map, baseKey, 1);
  });

  const flagHex = assignable[Math.floor(assignable.length / 2)];
  const flagKey = axialKey(flagHex.q, flagHex.r);
  map.hexes[flagKey].special = 'flag';
  map.hexes[flagKey].bonusType = null;
  revealAround(map, flagKey, 0);

  state.logs.unshift({ id: safeRandomId(), text: 'Демо-карта готова. Можно сразу проводить раунд.', ts: Date.now() });
  return state;
}

function getFlagKey(map) {
  return Object.keys(map.hexes).find((key) => map.hexes[key].special === 'flag') || null;
}

function getTeamById(teams, id) {
  return teams.find((t) => t.id === id);
}

function getOccupant(teams, key, exceptTeamId = null) {
  return teams.find((t) => t.posKey === key && t.id !== exceptTeamId) || null;
}

function getDistanceToFlag(team, map, flagKey) {
  if (!team?.posKey || !flagKey) return null;
  return mapDistance(map, parseKey(team.posKey), parseKey(flagKey));
}

function getActiveEffectsSummary(team) {
  const items = [];
  if (team.activeEffects.shield) items.push('Щит');
  if (team.activeEffects.boost) items.push('Форсаж');
  if (team.activeEffects.ignoreSwampOnce) items.push('Болото x1');
  if (team.activeEffects.duelRetry) items.push('Повтор дуэли');
  return items;
}

function computeReachableKeys(state, team) {
  if (!team?.posKey || team.movement <= 0) return [];
  const queue = [{ key: team.posKey, remaining: team.movement }];
  const best = new Map([[team.posKey, team.movement]]);
  const result = new Set();

  while (queue.length) {
    const current = queue.shift();
    const { q, r } = parseKey(current.key);
    for (const n of neighborsForMap(state.map, q, r)) {
      const nKey = axialKey(n.q, n.r);
      const hex = state.map.hexes[nKey];
      if (!hex || hex.terrain === 'mountain') continue;
      const occupied = getOccupant(state.teams, nKey, team.id);
      const terrainCost = hex.terrain === 'swamp' && (team.activeEffects.boost || team.activeEffects.ignoreSwampOnce)
        ? 1
        : TERRAIN_META[hex.terrain].cost;
      const nextRemaining = current.remaining - terrainCost;
      if (nextRemaining < 0) continue;
      if (occupied && occupied.id !== team.id) {
        result.add(nKey);
        continue;
      }
      if (!best.has(nKey) || best.get(nKey) < nextRemaining) {
        best.set(nKey, nextRemaining);
        queue.push({ key: nKey, remaining: nextRemaining });
        if (nKey !== team.posKey) result.add(nKey);
      }
    }
  }
  return Array.from(result);
}

function nextTeamId(teams, currentId) {
  const idx = teams.findIndex((t) => t.id === currentId);
  if (idx === -1) return teams[0]?.id ?? null;
  return teams[(idx + 1) % teams.length]?.id ?? currentId;
}

function smallLog(text) {
  return { id: safeRandomId(), text, ts: Date.now() };
}

function normalizeLoadedState(loaded) {
  const teamCount = Math.max(2, Math.min(20, loaded?.editor?.teamCount || loaded?.teams?.length || 6));
  return {
    ...loaded,
    teams: loaded.teams || createInitialTeams(teamCount),
    winner: loaded.winner || null,
    duel: loaded.duel || null,
    duelRetryPrompt: loaded.duelRetryPrompt || null,
    retreatSelection: loaded.retreatSelection || null,
    logs: loaded.logs || [],
    moveHighlights: loaded.moveHighlights || [],
    history: loaded.history || [],
    settings: {
      showCoords: true,
      showCosts: false,
      showFog: true,
      showBonuses: true,
      showFlag: true,
      revealBonusesThroughFog: false,
      revealFlagThroughFog: false,
      vividGrid: true,
      victoryScore: 15,
      ...(loaded.settings || {}),
    },
    editor: {
      tool: 'terrain',
      terrainType: 'plain',
      bonusType: 'energy',
      teamForBase: loaded?.editor?.teamForBase || loaded?.teams?.[0]?.id || 'team-1',
      roundRadius: 4,
      rectCols: 8,
      rectRows: 7,
      teamCount,
      ...(loaded.editor || {}),
    },
  };
}

function getSurpriseDestination(draft, teamId, fromKey) {
  const team = getTeamById(draft.teams, teamId);
  if (!team || !fromKey) return null;
  const from = parseKey(fromKey);
  const allCandidates = Object.values(draft.map.hexes)
    .filter((hex) => hex.terrain !== 'mountain')
    .filter((hex) => {
      const key = axialKey(hex.q, hex.r);
      if (key === fromKey) return false;
      const occupant = getOccupant(draft.teams, key, teamId);
      return !occupant;
    });

  const preferred = allCandidates.filter((hex) => mapDistance(draft.map, from, hex) === 3);
  const fallback = allCandidates.filter((hex) => mapDistance(draft.map, from, hex) > 0 && mapDistance(draft.map, from, hex) <= 3);
  const pool = preferred.length ? preferred : fallback;
  if (!pool.length) return null;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return axialKey(chosen.q, chosen.r);
}

function finalizeDuelResolution(draft, duel, winnerId) {
  const attacker = getTeamById(draft.teams, duel.attackerId);
  const defender = getTeamById(draft.teams, duel.defenderId);
  if (!attacker || !defender) return;

  const loser = winnerId === attacker.id ? defender : attacker;
  const winner = winnerId === attacker.id ? attacker : defender;
  const winnerOnContested = winner.id === attacker.id;

  if (winnerOnContested) {
    winner.posKey = duel.contestedKey;
    const contestedHex = draft.map.hexes[duel.contestedKey];
    const cost = contestedHex.terrain === 'swamp' && (winner.activeEffects.boost || winner.activeEffects.ignoreSwampOnce)
      ? 1
      : TERRAIN_META[contestedHex.terrain].cost;
    winner.movement = Math.max(0, winner.movement - cost);
  }

  const retreatOptions = getRetreatOptions(draft, duel.contestedKey, loser.id, winner.id);
  if (retreatOptions.length > 0) {
    draft.retreatSelection = {
      loserId: loser.id,
      winnerId: winner.id,
      contestedKey: duel.contestedKey,
      options: retreatOptions,
    };
    draft.logs.unshift(smallLog(`${loser.name} проиграли дуэль. Победитель выбирает гекс для отступления.`));
  } else {
    loser.posKey = loser.baseKey;
    draft.logs.unshift(smallLog(`${loser.name} проиграли дуэль и были отправлены на базу.`));
  }

  winner.score += 1;
  revealAround(draft.map, winner.posKey, 1);
  draft.logs.unshift(smallLog(`Победитель дуэли: ${winner.name}.`));

  if (winner.score >= draft.settings.victoryScore) {
    draft.winner = { teamId: winner.id, reason: 'Победа по очкам' };
  }
  if (winner.posKey === getFlagKey(draft.map) && !draft.winner) {
    draft.winner = { teamId: winner.id, reason: 'Флаг захвачен' };
  }
  draft.duel = null;
}

function getRetreatOptions(draft, contestedKey, loserId, winnerId) {
  const center = parseKey(contestedKey);
  return neighborsForMap(draft.map, center.q, center.r)
    .map((n) => axialKey(n.q, n.r))
    .filter((nKey) => {
      const hex = draft.map.hexes[nKey];
      if (!hex || hex.terrain === 'mountain') return false;
      const occupant = getOccupant(draft.teams, nKey, loserId);
      if (occupant && occupant.id !== winnerId) return false;
      return nKey !== contestedKey;
    });
}

export default function HexTournamentMapApp() {
  const [state, setState] = useState(() => {
    const loaded = safeLoadState();
    return loaded ? normalizeLoadedState(loaded) : createDemoState();
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    safeSaveState(state);
  }, [state]);

  const currentTeam = useMemo(() => getTeamById(state.teams, state.activeTeamId), [state.teams, state.activeTeamId]);
  const flagKey = useMemo(() => getFlagKey(state.map), [state.map]);
  const reachable = useMemo(() => (currentTeam ? computeReachableKeys(state, currentTeam) : []), [state, currentTeam]);
  const missingBaseTeams = useMemo(() => getTeamsMissingBases(state.teams), [state.teams]);
  const activeLeader = useMemo(() => {
    if (!flagKey) return state.teams[0] ?? null;
    return [...state.teams]
      .filter((t) => t.posKey)
      .sort((a, b) => {
        const ad = getDistanceToFlag(a, state.map, flagKey) ?? Number.POSITIVE_INFINITY;
        const bd = getDistanceToFlag(b, state.map, flagKey) ?? Number.POSITIVE_INFINITY;
        return ad - bd || b.score - a.score;
      })[0] || null;
  }, [state.teams, state.map, flagKey]);

  const phaseMeta = {
    setup: {
      title: 'Настройка карты',
      subtitle: 'Подготовьте карту, базы, флаг, бонусы и команды.',
      color: 'bg-cyan-600',
    },
    scoring: {
      title: 'Идёт битва! — Начислить ходы',
      subtitle: 'Введите результаты активности и начислите ходы командам.',
      color: 'bg-amber-600',
    },
    movement: {
      title: 'Идёт битва! — Сделайте ходы',
      subtitle: 'Ходы начислены. Команды по очереди перемещаются по карте.',
      color: 'bg-emerald-600',
    },
  };
  const currentPhase = phaseMeta[state.phase] || phaseMeta.setup;

  useEffect(() => {
    setState((prev) => ({ ...prev, moveHighlights: reachable }));
  }, [currentTeam?.id, currentTeam?.movement, currentTeam?.posKey, JSON.stringify(reachable)]);

  useEffect(() => {
    if (state.phase !== 'movement' || state.winner) return;
    const totalMoves = state.teams.reduce((sum, team) => sum + (team.movement || 0), 0);
    if (totalMoves <= 0) {
      setState((prev) => {
        if (prev.phase !== 'movement' || prev.winner) return prev;
        return {
          ...prev,
          phase: 'scoring',
          activeTab: 'round',
          logs: [smallLog('У всех команд закончились ходы. Начислите новые ходы после следующей активности.'), ...prev.logs],
        };
      });
    }
  }, [state.phase, state.winner, state.teams, state.activeTab]);

  const pushHistory = (draft) => {
    const snapshot = deepClone({
      mode: draft.mode,
      phase: draft.phase,
      activeTab: draft.activeTab,
      currentRound: draft.currentRound,
      activeTeamId: draft.activeTeamId,
      map: draft.map,
      teams: draft.teams,
      winner: draft.winner,
      logs: draft.logs,
      settings: draft.settings,
      editor: draft.editor,
      duel: draft.duel,
      duelRetryPrompt: draft.duelRetryPrompt,
      retreatSelection: draft.retreatSelection,
      importText: draft.importText,
      moveHighlights: draft.moveHighlights,
    });
    draft.history = [...(draft.history || []), snapshot].slice(-40);
  };

  const mutateState = (fn) => {
    setState((prev) => {
      const draft = deepClone(prev);
      pushHistory(draft);
      fn(draft);
      return draft;
    });
  };

  const addLog = (draft, text) => {
    draft.logs.unshift(smallLog(text));
  };

  const resetRoundMovement = (draft) => {
    draft.teams.forEach((team) => { team.movement = 0; });
  };

  const checkComeback = (draft) => {
    const fKey = getFlagKey(draft.map);
    if (!fKey) return;
    const distances = draft.teams
      .filter((team) => team.posKey)
      .map((team) => getDistanceToFlag(team, draft.map, fKey))
      .filter((v) => Number.isFinite(v));
    if (!distances.length) return;
    const leaderDistance = Math.min(...distances);
    draft.teams.forEach((team) => {
      if (!team.posKey) return;
      const dist = getDistanceToFlag(team, draft.map, fKey);
      if (dist !== null && dist - leaderDistance >= 4) {
        team.supportTokens += 1;
        addLog(draft, `${team.name} получили жетон поддержки за отставание.`);
      }
    });
  };

  const rebuildMapWithCurrentShape = (draft, shape = draft.map.shape) => {
    const count = Math.max(2, Math.min(20, Number(draft.editor?.teamCount || draft.teams.length || 6)));
    draft.map = shape === 'rect'
      ? createRectMap(draft.editor?.rectCols || 8, draft.editor?.rectRows || 7)
      : createRoundMap(draft.editor?.roundRadius || 4);
    draft.teams = createInitialTeams(count);
    draft.editor.teamCount = count;
    draft.editor.teamForBase = draft.teams[0]?.id || 'team-1';
    draft.activeTeamId = draft.teams[0]?.id || null;
    draft.phase = 'setup';
    draft.currentRound = 1;
    draft.winner = null;
    draft.duel = null;
    draft.duelRetryPrompt = null;
    draft.retreatSelection = null;
    draft.settings.showFog = true;
    draft.logs = [smallLog(`Создана новая ${shape === 'rect' ? 'прямоугольная' : 'круглая'} карта на ${count} команд.`)];
  };

  const createNewMap = () => {
    mutateState((draft) => {
      rebuildMapWithCurrentShape(draft, draft.map.shape);
    });
  };

  const loadDemo = () => setState(createDemoState());

  const undoLast = () => {
    setState((prev) => {
      if (!prev.history?.length) return prev;
      const nextHistory = [...prev.history];
      const snapshot = nextHistory.pop();
      return { ...snapshot, history: nextHistory };
    });
  };

  const handleMapHexClick = (key) => {
    if (state.mode === 'host' && state.activeTab === 'editor') {
      mutateState((draft) => {
        const hex = draft.map.hexes[key];
        if (!hex) return;
        if (draft.editor.tool === 'terrain') {
          hex.terrain = draft.editor.terrainType;
          if (hex.terrain === 'mountain') {
            hex.special = null;
            hex.bonusType = null;
            hex.bonusUsed = false;
            if (hex.teamBaseId) {
              const baseOwner = getTeamById(draft.teams, hex.teamBaseId);
              if (baseOwner) {
                baseOwner.baseKey = null;
                if (baseOwner.posKey === key) baseOwner.posKey = null;
              }
              hex.teamBaseId = null;
            }
          }
          addLog(draft, `Гекс ${key} изменён: ${TERRAIN_META[draft.editor.terrainType].label}.`);
        }
        if (draft.editor.tool === 'bonus' && hex.terrain !== 'mountain') {
          hex.special = 'bonus';
          hex.bonusType = draft.editor.bonusType;
          hex.bonusUsed = false;
          hex.teamBaseId = null;
          addLog(draft, `На гексе ${key} установлен бонус: ${BONUS_META[draft.editor.bonusType].label}.`);
        }
        if (draft.editor.tool === 'flag' && hex.terrain !== 'mountain') {
          Object.values(draft.map.hexes).forEach((h) => { if (h.special === 'flag') h.special = null; });
          hex.special = 'flag';
          hex.bonusType = null;
          hex.teamBaseId = null;
          addLog(draft, `Флаг перенесён на ${key}.`);
        }
        if (draft.editor.tool === 'base' && hex.terrain !== 'mountain') {
          const team = getTeamById(draft.teams, draft.editor.teamForBase);
          if (team) {
            Object.values(draft.map.hexes).forEach((h) => {
              if (h.teamBaseId === team.id) {
                h.teamBaseId = null;
                if (h.special === 'base') h.special = null;
              }
            });
            hex.special = 'base';
            hex.teamBaseId = team.id;
            team.baseKey = key;
            team.posKey = key;
            revealAround(draft.map, key, 1);
            addLog(draft, `База команды ${team.name} установлена на ${key}.`);
          }
        }
        if (draft.editor.tool === 'clear') {
          if (hex.teamBaseId) {
            const baseTeam = getTeamById(draft.teams, hex.teamBaseId);
            if (baseTeam) {
              baseTeam.baseKey = null;
              if (baseTeam.posKey === key) baseTeam.posKey = null;
            }
          }
          hex.special = null;
          hex.bonusType = null;
          hex.bonusUsed = false;
          hex.teamBaseId = null;
          addLog(draft, `С гекса ${key} удалены специальные свойства.`);
        }
      });
      return;
    }

    if (state.retreatSelection && state.retreatSelection.options?.includes(key)) {
      mutateState((draft) => {
        if (!draft.retreatSelection || !draft.retreatSelection.options?.includes(key)) return;
        const loser = getTeamById(draft.teams, draft.retreatSelection.loserId);
        if (!loser) return;
        loser.posKey = key;
        revealAround(draft.map, key, 1);
        addLog(draft, `${loser.name} отступили на ${key} после дуэли.`);
        draft.retreatSelection = null;
      });
      return;
    }

    if (state.mode === 'host' && state.phase === 'movement' && state.activeTab !== 'editor' && currentTeam && state.moveHighlights.includes(key) && !state.winner) {
      mutateState((draft) => {
        const team = getTeamById(draft.teams, draft.activeTeamId);
        if (!team || !team.posKey) return;
        const destination = draft.map.hexes[key];
        if (!destination) return;
        const startKey = team.posKey;
        const start = parseKey(startKey);
        const end = parseKey(key);
        if (mapDistance(draft.map, start, end) !== 1) {
          addLog(draft, `Недопустимый ход ${team.name}: можно идти только на соседний гекс.`);
          return;
        }

        const occupant = getOccupant(draft.teams, key, team.id);
        const effectiveCost = destination.terrain === 'swamp' && (team.activeEffects.boost || team.activeEffects.ignoreSwampOnce)
          ? 1
          : TERRAIN_META[destination.terrain].cost;

        if (destination.terrain === 'mountain' || effectiveCost > team.movement) {
          addLog(draft, `Недопустимый ход ${team.name}: не хватает очков хода или препятствие.`);
          return;
        }

        if (occupant) {
          draft.duel = {
            attackerId: team.id,
            defenderId: occupant.id,
            contestedKey: key,
            attackerFrom: startKey,
            retryCount: 0,
          };
          addLog(draft, `Дуэль! ${team.name} атакуют ${occupant.name} на ${key}.`);
          return;
        }

        team.posKey = key;
        team.movement -= effectiveCost;
        if (destination.terrain === 'swamp' && team.activeEffects.ignoreSwampOnce) team.activeEffects.ignoreSwampOnce = false;
        if (destination.terrain === 'swamp' && team.activeEffects.boost) team.activeEffects.boost = false;
        revealAround(draft.map, key, 1);
        addLog(draft, `${team.name} переместились на ${key}.`);

        if (destination.special === 'bonus' && !destination.bonusUsed && destination.bonusType) {
          destination.bonusUsed = true;
          team.score += 1;
          if (destination.bonusType === 'energy') {
            team.movement += 1;
          }
          if (destination.bonusType === 'scanner') {
            revealAround(draft.map, key, 2);
          }
          if (destination.bonusType === 'boost') {
            team.activeEffects.boost = true;
            team.activeEffects.ignoreSwampOnce = true;
          }
          if (destination.bonusType === 'shield') {
            team.activeEffects.shield = true;
          }
          if (destination.bonusType === 'surprise') {
            const surpriseTarget = getSurpriseDestination(draft, team.id, key);
            if (surpriseTarget) {
              team.posKey = surpriseTarget;
              revealAround(draft.map, surpriseTarget, 1);
              addLog(draft, `${team.name} активировали сюрприз и телепортировались на ${surpriseTarget}.`);
            } else {
              addLog(draft, `${team.name} активировали сюрприз, но подходящего гекса не нашлось.`);
            }
          }
          addLog(draft, `${team.name} активировали бонус: ${BONUS_META[destination.bonusType].label}.`);
        }

        if (team.posKey === getFlagKey(draft.map)) {
          draft.winner = { teamId: team.id, reason: 'Флаг захвачен' };
          addLog(draft, `${team.name} захватили флаг и победили!`);
        }
        if (team.score >= draft.settings.victoryScore && !draft.winner) {
          draft.winner = { teamId: team.id, reason: 'Победа по очкам' };
          addLog(draft, `${team.name} набрали победные очки и выиграли.`);
        }
      });
    }
  };

  const resolveDuel = (winnerId) => {
    mutateState((draft) => {
      const duel = draft.duel;
      if (!duel) return;
      const attacker = getTeamById(draft.teams, duel.attackerId);
      const defender = getTeamById(draft.teams, duel.defenderId);
      if (!attacker || !defender) return;

      const loser = winnerId === attacker.id ? defender : attacker;
      if (loser.activeEffects.duelRetry) {
        draft.duelRetryPrompt = {
          duel,
          provisionalWinnerId: winnerId,
        };
        draft.duel = null;
        addLog(draft, `${loser.name} могут потратить эффект «Повтор дуэли» и потребовать переигровку.`);
        return;
      }

      finalizeDuelResolution(draft, duel, winnerId);
    });
  };

  const useShieldToHold = () => {
    mutateState((draft) => {
      const duel = draft.duel;
      if (!duel) return;
      const defender = getTeamById(draft.teams, duel.defenderId);
      if (!defender?.activeEffects.shield) return;
      defender.activeEffects.shield = false;
      draft.duel = null;
      addLog(draft, `${defender.name} потратили щит и сохранили позицию. Дуэль отменена.`);
    });
  };

  const retryDuel = () => {
    mutateState((draft) => {
      const prompt = draft.duelRetryPrompt;
      if (!prompt) return;
      const duel = prompt.duel;
      const provisionalWinner = getTeamById(draft.teams, prompt.provisionalWinnerId);
      const loserId = duel.attackerId === prompt.provisionalWinnerId ? duel.defenderId : duel.attackerId;
      const loser = getTeamById(draft.teams, loserId);
      if (!loser?.activeEffects.duelRetry) {
        finalizeDuelResolution(draft, duel, prompt.provisionalWinnerId);
        draft.duelRetryPrompt = null;
        return;
      }
      loser.activeEffects.duelRetry = false;
      draft.duel = {
        ...duel,
        retryCount: (duel.retryCount || 0) + 1,
      };
      draft.duelRetryPrompt = null;
      addLog(draft, `${loser.name} потребовали повторную дуэль против ${provisionalWinner?.name || 'соперника'}.`);
    });
  };

  const acceptDuelResult = () => {
    mutateState((draft) => {
      const prompt = draft.duelRetryPrompt;
      if (!prompt) return;
      finalizeDuelResolution(draft, prompt.duel, prompt.provisionalWinnerId);
      draft.duelRetryPrompt = null;
    });
  };

  const assignMovementByPlacements = (placements) => {
    mutateState((draft) => {
      draft.teams.forEach((team) => {
        const place = Number(placements[team.id]);
        if (place === 1) team.movement = 3;
        else if (place === 2) team.movement = 2;
        else if (place >= 3) team.movement = 1;
        else team.movement = 0;
      });
      addLog(draft, 'Очки движения начислены по местам в активности.');
      checkComeback(draft);
      draft.phase = 'movement';
      draft.activeTab = 'round';
    });
  };

  const setFogEnabled = (checked) => {
    if (!checked) {
      const ok = confirmAction('Сейчас все увидят карту. Вы действительно хотите отключить туман войны и открыть карту?');
      if (!ok) return;
    }
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        showFog: checked,
      },
    }));
  };

  const startTournament = () => {
    if (missingBaseTeams.length > 0) {
      confirmAction(`Нельзя начать турнир: расставьте базы для команд: ${missingBaseTeams.map((t) => t.name).join(', ')}`);
      return;
    }
    mutateState((draft) => {
      draft.settings.showFog = true;
      draft.phase = 'scoring';
      draft.activeTab = 'round';
      draft.teams.forEach((team) => { team.movement = 0; });
      addLog(draft, 'Турнир начался. Туман войны включён. Ожидается начисление ходов после первой активности.');
    });
  };

  const goToMovementPhase = () => {
    mutateState((draft) => {
      draft.phase = 'movement';
      draft.activeTab = 'round';
      addLog(draft, 'Статус изменён: команды делают ходы.');
    });
  };

  const endRound = () => {
    mutateState((draft) => {
      draft.currentRound += 1;
      resetRoundMovement(draft);
      draft.phase = 'scoring';
      draft.activeTab = 'round';
      addLog(draft, `Раунд завершён. Начат раунд ${draft.currentRound}.`);
    });
  };

  const spendSupport = (teamId, type) => {
    mutateState((draft) => {
      const team = getTeamById(draft.teams, teamId);
      if (!team || team.supportTokens <= 0) return;
      team.supportTokens -= 1;
      if (type === 'move') team.movement += 1;
      if (type === 'swamp') team.activeEffects.ignoreSwampOnce = true;
      if (type === 'duel') team.activeEffects.duelRetry = true;
      addLog(draft, `${team.name} использовали жетон поддержки: ${type === 'move' ? '+1 ход' : type === 'swamp' ? 'игнор болота' : 'повтор дуэли'}.`);
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hex-tournament-map.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJsonText = () => {
    try {
      const parsed = JSON.parse(state.importText);
      setState(normalizeLoadedState({ ...parsed, history: [] }));
    } catch (e) {
      alert('Не удалось импортировать JSON.');
    }
  };

  const importFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setState(normalizeLoadedState({ ...parsed, history: [] }));
      } catch {
        alert('Файл JSON не распознан.');
      }
    };
    reader.readAsText(file);
  };

  const regenerateMap = (shape) => {
    mutateState((draft) => {
      rebuildMapWithCurrentShape(draft, shape);
    });
  };

  const mapEntries = Object.values(state.map.hexes);
  const size = state.map.shape === 'rect' && state.map.cols > 14 ? 30 : 38;
  const pixels = mapEntries.map((hex) => ({ ...hex, ...hexToPixel(state.map, hex.q, hex.r, size) }));
  const minX = Math.min(...pixels.map((h) => h.x), 0) - 80;
  const maxX = Math.max(...pixels.map((h) => h.x), 0) + 80;
  const minY = Math.min(...pixels.map((h) => h.y), 0) - 80;
  const maxY = Math.max(...pixels.map((h) => h.y), 0) + 80;

  const [placements, setPlacements] = useState(Object.fromEntries(state.teams.map((t, i) => [t.id, i + 1])));
  useEffect(() => {
    setPlacements(Object.fromEntries(state.teams.map((t, i) => [t.id, i + 1])));
  }, [state.teams.length]);

  const winnerTeam = state.winner ? getTeamById(state.teams, state.winner.teamId) : null;
  const viewerTeams = [...state.teams].sort((a, b) => b.score - a.score || (getDistanceToFlag(a, state.map, flagKey) ?? 999) - (getDistanceToFlag(b, state.map, flagKey) ?? 999)).slice(0, 6);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
        <div className="max-w-[1800px] mx-auto grid gap-4">
          {state.mode === 'host' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold tracking-tight">Турнирная карта гексов</div>
                <div className="text-slate-400 text-sm mt-1">Локальный MVP для проведения офлайн инженерных турниров</div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
                  <span className="text-sm">Туман войны</span>
                  <Switch checked={!!state.settings.showFog} onCheckedChange={setFogEnabled} />
                </div>
                <Button variant="outline" onClick={() => setState((prev) => ({ ...prev, mode: 'viewer' }))} className="rounded-2xl bg-slate-900 border-slate-700 text-slate-100 hover:text-slate-50">
                  <Eye className="w-4 h-4 mr-2" /> Режим зрителей
                </Button>
                <Button variant="outline" onClick={undoLast} className="rounded-2xl bg-slate-900 border-slate-700 text-slate-100 hover:text-slate-50"><Undo2 className="w-4 h-4 mr-2" />Undo</Button>
                <Button variant="outline" onClick={() => setState(createDemoState())} className="rounded-2xl bg-slate-900 border-slate-700 text-slate-100 hover:text-slate-50"><RotateCcw className="w-4 h-4 mr-2" />Сброс</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 px-4 py-4 shadow-2xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-xl bg-slate-800 text-slate-100 px-3 py-1.5">Раунд {state.currentRound}</Badge>
                  {currentTeam && <Badge className="rounded-xl px-3 py-1.5 text-white" style={{ backgroundColor: currentTeam.color }}>{currentTeam.name}</Badge>}
                  {activeLeader && <Badge className="rounded-xl bg-amber-600 text-white px-3 py-1.5"><Crown className="w-3.5 h-3.5 mr-1" /> {activeLeader.name}</Badge>}
                  <Badge className="rounded-xl bg-slate-800 text-slate-100 px-3 py-1.5">Победа: флаг или {state.settings.victoryScore} очков</Badge>
                </div>
                <Button variant="outline" onClick={() => setState((prev) => ({ ...prev, mode: 'host' }))} className="rounded-2xl border-slate-700 bg-slate-950/70 text-slate-100">
                  <EyeOff className="w-4 h-4 mr-2" /> Ведущий
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {viewerTeams.map((team) => (
                  <div key={team.id} className="rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                      {team.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">Очки: {team.score} · До флага: {getDistanceToFlag(team, state.map, flagKey) ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`grid gap-4 ${state.mode === 'host' ? 'lg:grid-cols-[1.45fr_440px]' : 'grid-cols-1'}`}>
            <Card className={`rounded-[28px] border-slate-800 bg-slate-900/70 shadow-2xl overflow-hidden ${state.mode === 'viewer' ? 'border-slate-700 bg-slate-900/40' : ''}`}>
              <CardContent className="p-0">
                <div className="border-b border-slate-800 px-4 py-3 flex flex-col gap-3 bg-slate-950/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className={`rounded-2xl px-4 py-3 text-white shadow-lg ${currentPhase.color}`}>
                      <div className="text-sm uppercase tracking-wide opacity-90">Статус игры</div>
                      <div className="text-xl font-semibold leading-tight">{currentPhase.title}</div>
                      <div className="text-sm opacity-90 mt-1">{currentPhase.subtitle}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {state.phase === 'setup' && (
                        <Button className="rounded-2xl h-12 px-5 text-base" onClick={startTournament} disabled={missingBaseTeams.length > 0}>
                          Начать турнир!
                        </Button>
                      )}
                      {state.phase === 'scoring' && (
                        <Button className="rounded-2xl h-12 px-5 text-base bg-emerald-600 hover:bg-emerald-500" onClick={goToMovementPhase}>
                          Ходить
                        </Button>
                      )}
                      {state.phase === 'movement' && (
                        <Button variant="outline" className="rounded-2xl h-12 px-5 text-base border-slate-700 bg-slate-900 text-slate-100" onClick={endRound}>
                          Завершить раунд
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge className="rounded-xl bg-slate-800 text-slate-100">Раунд {state.currentRound}</Badge>
                    {currentTeam && <Badge className="rounded-xl text-white" style={{ backgroundColor: currentTeam.color }}>{currentTeam.name}: {currentTeam.movement} х.</Badge>}
                    {activeLeader && <Badge className="rounded-xl bg-amber-600 text-white">Лидер: {activeLeader.name}</Badge>}
                    <Badge className="rounded-xl bg-slate-800 text-slate-100">Победа: флаг или {state.settings.victoryScore} очков</Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                    <div>
                      {state.retreatSelection
                        ? 'Выберите подсвеченный соседний гекс: туда будет отступать проигравший после дуэли.'
                        : state.phase === 'movement'
                          ? 'Клик по подсвеченному гексу перемещает активную команду.'
                          : state.phase === 'scoring'
                            ? 'Введите результаты активности и нажмите «Начислить ходы».'
                            : missingBaseTeams.length > 0
                              ? `Перед стартом расставьте базы: ${missingBaseTeams.map((t) => t.name).join(', ')}`
                              : 'Сейчас идёт подготовка карты. Можно начинать турнир.'}
                    </div>
                    {state.phase !== 'setup' && (
                      <div className="flex flex-wrap gap-2 items-center">
                        {state.teams.map((team) => (
                          <Badge key={team.id} className="rounded-xl text-white" style={{ backgroundColor: team.color }}>
                            {team.name}: {team.movement}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative h-[75vh] bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_65%)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%)] pointer-events-none" />
                  {state.mode === 'viewer' && (
                    <div className="absolute left-4 top-4 z-10 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 backdrop-blur">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Проекторный режим</div>
                      <div className="mt-1 text-lg font-semibold">{currentPhase.title}</div>
                      <div className="mt-1 text-sm text-slate-300">{currentTeam ? `${currentTeam.name} активна` : 'Нет активной команды'}</div>
                    </div>
                  )}
                  <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="w-full h-full">
                    <defs>
                      <filter id="glow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    </defs>
                    {pixels.map((hex) => {
                      const key = axialKey(hex.q, hex.r);
                      const terrain = TERRAIN_META[hex.terrain];
                      const special = hex.special;
                      const occupied = getOccupant(state.teams, key) || state.teams.find((t) => t.posKey === key) || null;
                      const isReachable = state.mode === 'host' && state.activeTab !== 'editor' && state.moveHighlights.includes(key);
                      const isRetreatOption = !!state.retreatSelection?.options?.includes(key);
                      const fogged = state.settings.showFog && hex.fog;
                      const showFlagOnHex = special === 'flag' && state.settings.showFlag && (!fogged || state.settings.revealFlagThroughFog);
                      const showBonusOnHex = special === 'bonus' && state.settings.showBonuses && !!hex.bonusType && (!fogged || state.settings.revealBonusesThroughFog);
                      const strokeColor = isRetreatOption ? '#f43f5e' : isReachable ? '#f8fafc' : state.settings.vividGrid ? '#94a3b8' : '#475569';
                      return (
                        <g key={key} onClick={() => handleMapHexClick(key)} className="cursor-pointer">
                          <polygon
                            points={getHexPoints(hex.x, hex.y, size - 2)}
                            fill={terrain.fill}
                            opacity={fogged ? 0.22 : 0.96}
                            stroke={strokeColor}
                            strokeWidth={isRetreatOption ? 4 : isReachable ? 3 : 1.5}
                            filter={isRetreatOption || isReachable ? 'url(#glow)' : undefined}
                          />
                          {showFlagOnHex && (
                            <g transform={`translate(${hex.x - 10}, ${hex.y - 12})`} opacity={fogged ? 0.8 : 1}>
                              <Flag color="#facc15" size={22} />
                            </g>
                          )}
                          {showBonusOnHex && (
                            <g transform={`translate(${hex.x - 10}, ${hex.y - 12})`} opacity={hex.bonusUsed ? 0.35 : fogged ? 0.8 : 1}>
                              {React.createElement(BONUS_META[hex.bonusType].icon, { color: BONUS_META[hex.bonusType].color, size: 20 })}
                            </g>
                          )}
                          {special === 'base' && !fogged && (
                            <circle cx={hex.x} cy={hex.y} r={9} fill={getTeamById(state.teams, hex.teamBaseId)?.color || '#fff'} opacity={0.85} />
                          )}
                          {occupied && !fogged && (
                            <g transform={`translate(${hex.x - 12}, ${hex.y - 12})`}>
                              <rect x="2" y="10" width="20" height="8" rx="2" fill={occupied.color} stroke="#fff" strokeWidth="1.4" />
                              <rect x="8" y="6" width="8" height="6" rx="1.2" fill={occupied.color} stroke="#fff" strokeWidth="1" />
                              <line x1="16" y1="9" x2="24" y2="5" stroke="#fff" strokeWidth="1.6" />
                            </g>
                          )}
                          {state.settings.showCoords && !fogged && (
                            <text x={hex.x} y={hex.y + 18} textAnchor="middle" fontSize="8" fill="#e2e8f0">{key}</text>
                          )}
                          {state.settings.showCosts && !fogged && terrain.cost !== Infinity && (
                            <text x={hex.x} y={hex.y - 17} textAnchor="middle" fontSize="9" fill="#f8fafc">{terrain.cost}</text>
                          )}
                          {isRetreatOption && !fogged && (
                            <text x={hex.x} y={hex.y + 3} textAnchor="middle" fontSize="10" fill="#fecdd3">Отступление</text>
                          )}
                          {fogged && state.settings.showFog && (
                            <polygon points={getHexPoints(hex.x, hex.y, size - 4)} fill="rgba(2,6,23,0.78)" stroke="rgba(100,116,139,0.28)" strokeWidth="1" />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </CardContent>
            </Card>

            {state.mode === 'host' && (
              <Card className="rounded-[28px] border-slate-800 bg-slate-900/80 shadow-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2 text-slate-50"><Settings className="w-5 h-5 text-slate-200" /> Панель ведущего</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={state.activeTab} onValueChange={(value) => setState((prev) => ({ ...prev, activeTab: value }))} className="w-full">
                    <TabsList className="grid grid-cols-5 rounded-2xl bg-slate-800 mb-4 text-slate-100">
                      <TabsTrigger value="editor" className="text-slate-100 data-[state=active]:text-slate-50"><MapIcon className="w-4 h-4" /></TabsTrigger>
                      <TabsTrigger value="round" className="text-slate-100 data-[state=active]:text-slate-50"><Play className="w-4 h-4" /></TabsTrigger>
                      <TabsTrigger value="teams" className="text-slate-100 data-[state=active]:text-slate-50"><Users className="w-4 h-4" /></TabsTrigger>
                      <TabsTrigger value="log" className="text-slate-100 data-[state=active]:text-slate-50"><ScrollText className="w-4 h-4" /></TabsTrigger>
                      <TabsTrigger value="view" className="text-slate-100 data-[state=active]:text-slate-50"><Eye className="w-4 h-4" /></TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="space-y-4 mt-0">
                      <div className="grid grid-cols-2 gap-3">
                        <Button className="rounded-2xl" variant={state.map.shape === 'rect' ? 'default' : 'outline'} onClick={() => regenerateMap('rect')}>Прямоугольная</Button>
                        <Button className="rounded-2xl" variant={state.map.shape === 'round' ? 'default' : 'outline'} onClick={() => regenerateMap('round')}>Круглая</Button>
                      </div>

                      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                        <Label className="text-slate-100">Количество команд</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={2}
                            max={20}
                            value={state.editor.teamCount || state.teams.length}
                            onChange={(e) => setState((prev) => ({
                              ...prev,
                              editor: {
                                ...prev.editor,
                                teamCount: Math.max(2, Math.min(20, Number(e.target.value || 6))),
                              },
                            }))}
                            className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400"
                          />
                          <Button variant="outline" className="rounded-2xl" onClick={() => mutateState((draft) => rebuildMapWithCurrentShape(draft, draft.map.shape))}>
                            Применить
                          </Button>
                        </div>
                        <div className="text-xs text-slate-400">До 20 команд. После изменения карта и базы будут пересозданы.</div>
                      </div>

                      {state.map.shape === 'rect' && (
                        <div className="space-y-2">
                          <Label className="text-slate-100">Размер прямоугольной карты</Label>
                          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                            <div className="space-y-1">
                              <div className="text-xs text-slate-300">Ширина</div>
                              <Input
                                type="number"
                                min={2}
                                max={80}
                                value={state.editor.rectCols || 8}
                                onChange={(e) => setState((prev) => ({
                                  ...prev,
                                  editor: {
                                    ...prev.editor,
                                    rectCols: Math.max(2, Math.min(80, Number(e.target.value || 8))),
                                  },
                                }))}
                                className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-slate-300">Высота</div>
                              <Input
                                type="number"
                                min={2}
                                max={40}
                                value={state.editor.rectRows || 7}
                                onChange={(e) => setState((prev) => ({
                                  ...prev,
                                  editor: {
                                    ...prev.editor,
                                    rectRows: Math.max(2, Math.min(40, Number(e.target.value || 7))),
                                  },
                                }))}
                                className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                            <Button variant="outline" className="rounded-2xl" onClick={() => regenerateMap('rect')}>Применить</Button>
                          </div>
                        </div>
                      )}
                      {state.map.shape === 'round' && (
                        <div className="space-y-2">
                          <Label className="text-slate-100">Радиус круглой карты (от центра)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={4}
                              max={10}
                              value={state.editor.roundRadius || 4}
                              onChange={(e) => setState((prev) => ({
                                ...prev,
                                editor: {
                                  ...prev.editor,
                                  roundRadius: Math.max(4, Math.min(10, Number(e.target.value || 4))),
                                },
                              }))}
                              className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400"
                            />
                            <Button variant="outline" className="rounded-2xl" onClick={() => regenerateMap('round')}>Применить</Button>
                          </div>
                        </div>
                      )}
                      <Separator className="bg-slate-800" />
                      <div className="space-y-2">
                        <Label className="text-slate-100">Инструмент</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ['terrain', 'Ландшафт'],
                            ['bonus', 'Бонус'],
                            ['flag', 'Флаг'],
                            ['base', 'База'],
                            ['clear', 'Очистить'],
                          ].map(([value, label]) => (
                            <Button key={value} variant={state.editor.tool === value ? 'default' : 'outline'} className="rounded-2xl" onClick={() => setState((prev) => ({ ...prev, editor: { ...prev.editor, tool: value } }))}>{label}</Button>
                          ))}
                        </div>
                      </div>
                      {state.editor.tool === 'terrain' && (
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(TERRAIN_META).map(([key, meta]) => (
                            <Button key={key} variant={state.editor.terrainType === key ? 'default' : 'outline'} className="rounded-2xl justify-start" onClick={() => setState((prev) => ({ ...prev, editor: { ...prev.editor, terrainType: key } }))}>{meta.label}</Button>
                          ))}
                        </div>
                      )}
                      {state.editor.tool === 'bonus' && (
                        <div className="space-y-2">
                          <Label className="text-slate-100">Тип бонуса</Label>
                          <Select value={state.editor.bonusType} onValueChange={(value) => setState((prev) => ({ ...prev, editor: { ...prev.editor, bonusType: value } }))}>
                            <SelectTrigger className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-700 text-slate-100">
                              {Object.entries(BONUS_META).map(([key, meta]) => <SelectItem key={key} value={key} className="text-slate-100 focus:text-slate-950">{meta.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {state.editor.tool === 'base' && (
                        <div className="space-y-2">
                          <Label className="text-slate-100">Команда для базы</Label>
                          <Select value={state.editor.teamForBase} onValueChange={(value) => setState((prev) => ({ ...prev, editor: { ...prev.editor, teamForBase: value } }))}>
                            <SelectTrigger className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-700 text-slate-100 max-h-[240px]">
                              {state.teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-slate-100 focus:text-slate-950">{team.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Separator className="bg-slate-800" />
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="rounded-2xl" onClick={createNewMap}>Новая карта</Button>
                        <Button variant="outline" className="rounded-2xl" onClick={loadDemo}>Демо-карта</Button>
                        <Button variant="outline" className="rounded-2xl" onClick={exportJson}><Download className="w-4 h-4 mr-2" />JSON</Button>
                        <Button variant="outline" className="rounded-2xl" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Файл</Button>
                        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importFile} />
                      </div>
                      <Textarea value={state.importText} onChange={(e) => setState((prev) => ({ ...prev, importText: e.target.value }))} className="min-h-[100px] rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400" placeholder="Вставьте JSON сценария сюда" />
                      <Button className="w-full rounded-2xl" onClick={importJsonText}>Импорт из текста</Button>
                    </TabsContent>

                    <TabsContent value="round" className="space-y-4 mt-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-slate-300">Текущий раунд</div>
                          <div className="text-2xl font-semibold">{state.currentRound}</div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Button variant="outline" className="rounded-2xl" onClick={() => mutateState((draft) => { draft.currentRound += 1; resetRoundMovement(draft); draft.phase = 'scoring'; addLog(draft, `Начат раунд ${draft.currentRound}.`); })}>След. раунд</Button>
                          <Button variant="outline" className="rounded-2xl" onClick={() => mutateState((draft) => { resetRoundMovement(draft); draft.phase = 'scoring'; addLog(draft, 'Очки движения раунда сброшены.'); })}>Сброс хода</Button>
                          <Button variant="outline" className="rounded-2xl" onClick={endRound}>Завершить раунд</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {state.teams.map((team) => (
                          <div key={team.id} className="grid grid-cols-[1fr_76px] gap-2 items-center">
                            <div className="flex items-center gap-2 text-slate-100">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                              <span className="text-slate-100">{team.name}</span>
                            </div>
                            <Input type="number" min={1} max={20} value={placements[team.id] ?? ''} onChange={(e) => setPlacements((prev) => ({ ...prev, [team.id]: Number(e.target.value || 0) }))} className="rounded-xl bg-slate-950 border-slate-700 text-slate-50 placeholder:text-slate-400" style={{ color: '#f8fafc' }} />
                          </div>
                        ))}
                      </div>
                      <Button className="w-full rounded-2xl" onClick={() => assignMovementByPlacements(placements)} disabled={state.phase === 'setup'}>
                        Начислить ходы
                      </Button>
                      <Separator className="bg-slate-800" />
                      <div className="space-y-2">
                        <Label className="text-slate-100">Активная команда</Label>
                        <Select value={state.activeTeamId || ''} onValueChange={(value) => setState((prev) => ({ ...prev, activeTeamId: value }))}>
                          <SelectTrigger className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-950 border-slate-700 text-slate-100 max-h-[240px]">
                            {state.teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-slate-100 focus:text-slate-950">{team.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" className="w-full rounded-2xl" onClick={() => setState((prev) => ({ ...prev, activeTeamId: nextTeamId(prev.teams, prev.activeTeamId) }))} disabled={state.phase !== 'movement'}>Следующая команда</Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="teams" className="space-y-3 mt-0">
                      {state.teams.map((team) => {
                        const effects = getActiveEffectsSummary(team);
                        const distanceToFlag = getDistanceToFlag(team, state.map, flagKey);
                        return (
                          <Card key={team.id} className="rounded-2xl border-slate-800 bg-slate-950/80">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                                  <Input value={team.name} onChange={(e) => setState((prev) => ({ ...prev, teams: prev.teams.map((t) => t.id === team.id ? { ...t, name: e.target.value } : t) }))} className="h-8 rounded-xl bg-slate-900 border-slate-700 text-slate-50 placeholder:text-slate-400" style={{ color: '#f8fafc' }} />
                                </div>
                                <Badge className="rounded-xl bg-slate-800 shrink-0">{team.score} очк.</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-slate-200">
                                <div>Позиция: {team.posKey || '—'}</div>
                                <div>База: {team.baseKey || '—'}</div>
                                <div>Ходы: {team.movement}</div>
                                <div>Жетоны: {team.supportTokens}</div>
                                <div>До флага: {distanceToFlag ?? '—'}</div>
                                <div>Эффекты: {effects.length ? effects.join(', ') : '—'}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" className="rounded-xl" disabled={team.supportTokens <= 0} onClick={() => spendSupport(team.id, 'move')}>+1 ход</Button>
                                <Button size="sm" variant="outline" className="rounded-xl" disabled={team.supportTokens <= 0} onClick={() => spendSupport(team.id, 'swamp')}>Игнор болота</Button>
                                <Button size="sm" variant="outline" className="rounded-xl" disabled={team.supportTokens <= 0} onClick={() => spendSupport(team.id, 'duel')}>Повтор дуэли</Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="log" className="mt-0">
                      <ScrollArea className="h-[62vh] pr-2">
                        <div className="space-y-2">
                          {state.logs.map((log) => (
                            <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100">
                              <div>{log.text}</div>
                              <div className="text-xs text-slate-400 mt-1">{new Date(log.ts).toLocaleTimeString()}</div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="view" className="space-y-4 mt-0">
                      {[
                        ['showCoords', 'Показывать координаты'],
                        ['showCosts', 'Показывать стоимость клетки'],
                        ['showBonuses', 'Показывать бонусы'],
                        ['showFlag', 'Показывать флаг'],
                        ['vividGrid', 'Яркая сетка'],
                      ].map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-slate-100">
                          <span className="text-slate-100">{label}</span>
                          <Switch checked={state.settings[key]} onCheckedChange={(checked) => setState((prev) => ({ ...prev, settings: { ...prev.settings, [key]: checked } }))} />
                        </div>
                      ))}
                      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-slate-100">
                        <div className="font-medium">Видимость при тумане войны</div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Флаг виден сквозь туман</span>
                          <Switch checked={!!state.settings.revealFlagThroughFog} onCheckedChange={(checked) => setState((prev) => ({ ...prev, settings: { ...prev.settings, revealFlagThroughFog: checked } }))} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Бонусы видны сквозь туман</span>
                          <Switch checked={!!state.settings.revealBonusesThroughFog} onCheckedChange={(checked) => setState((prev) => ({ ...prev, settings: { ...prev.settings, revealBonusesThroughFog: checked } }))} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-100">Победные очки</Label>
                        <Input type="number" min={1} max={50} value={state.settings.victoryScore} onChange={(e) => setState((prev) => ({ ...prev, settings: { ...prev.settings, victoryScore: Number(e.target.value || 15) } }))} className="rounded-2xl bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-400" />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Dialog open={!!state.duel} onOpenChange={(open) => { if (!open) setState((prev) => ({ ...prev, duel: null })); }}>
          <DialogContent className="rounded-[28px] bg-slate-950 border-slate-800 text-slate-50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl"><Swords className="w-6 h-6 text-red-400" /> Дуэль — вызов брошен!</DialogTitle>
            </DialogHeader>
            {state.duel && (() => {
              const attacker = getTeamById(state.teams, state.duel.attackerId);
              const defender = getTeamById(state.teams, state.duel.defenderId);
              const defenderHasShield = !!defender?.activeEffects.shield;
              return (
                <div className="space-y-4">
                  <div className="text-slate-300">Сразитесь офлайн и укажите победителя. Победитель остаётся на спорном гексе, после чего ведущий выберет один из подсвеченных соседних гексов для отступления проигравшего.</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[attacker, defender].map((team) => team && (
                      <Button key={team.id} onClick={() => resolveDuel(team.id)} className="rounded-2xl h-16 text-base text-white" style={{ backgroundColor: team.color }}>
                        {team.name}
                      </Button>
                    ))}
                  </div>
                  {defenderHasShield && (
                    <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/40 p-3 text-sm text-emerald-100">
                      У защищающейся команды активен щит. Можно не принимать бой и сохранить позицию.
                    </div>
                  )}
                </div>
              );
            })()}
            <DialogFooter>
              {state.duel && getTeamById(state.teams, state.duel.defenderId)?.activeEffects.shield && (
                <Button variant="outline" className="rounded-2xl border-emerald-700 bg-emerald-950/40 text-emerald-100" onClick={useShieldToHold}>Потратить щит</Button>
              )}
              <Button variant="outline" className="rounded-2xl" onClick={() => setState((prev) => ({ ...prev, duel: null }))}>Отмена</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!state.duelRetryPrompt} onOpenChange={() => {}}>
          <DialogContent className="rounded-[28px] bg-slate-950 border-slate-800 text-slate-50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl"><Radar className="w-6 h-6 text-cyan-400" /> Повторная дуэль</DialogTitle>
            </DialogHeader>
            {state.duelRetryPrompt && (() => {
              const duel = state.duelRetryPrompt.duel;
              const provisionalWinner = getTeamById(state.teams, state.duelRetryPrompt.provisionalWinnerId);
              const loserId = duel.attackerId === state.duelRetryPrompt.provisionalWinnerId ? duel.defenderId : duel.attackerId;
              const loser = getTeamById(state.teams, loserId);
              return (
                <div className="space-y-4">
                  <div className="text-slate-300">{loser?.name} могут потратить эффект «Повтор дуэли» и потребовать переигровку против {provisionalWinner?.name}. Принять результат или провести дуэль заново?</div>
                  <div className="flex gap-2 flex-wrap">
                    <Button className="rounded-2xl" onClick={retryDuel}><Sparkles className="w-4 h-4 mr-2" /> Переиграть дуэль</Button>
                    <Button variant="outline" className="rounded-2xl" onClick={acceptDuelResult}>Оставить результат</Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Dialog open={!!state.winner} onOpenChange={() => {}}>
          <DialogContent className="rounded-[30px] bg-slate-950 border-slate-800 text-slate-50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl"><Trophy className="w-6 h-6 text-amber-400" /> Победа!</DialogTitle>
            </DialogHeader>
            {winnerTeam && (
              <div className="space-y-3">
                <div className="text-3xl font-semibold" style={{ color: winnerTeam.color }}>{winnerTeam.name}</div>
                <div className="text-slate-300">{state.winner.reason}</div>
                <Button className="rounded-2xl" onClick={() => setState((prev) => ({ ...prev, winner: null }))}>Закрыть окно</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
