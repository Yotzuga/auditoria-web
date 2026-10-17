import { CircleDot, Bomb, Gift, Spade, Shapes } from 'lucide-react'

export const REWARDS = [
  { id: 'plinko', name: 'Plinko', key: '1', color: '#F472B6', icon: CircleDot },
  { id: 'mines', name: 'Mines', key: '2', color: '#A5B4FC', icon: Bomb },
  { id: 'gachas', name: 'Gachas', key: '3', color: '#E879F9', icon: Gift },
  { id: 'cartas', name: 'Cartas', key: '4', color: '#FB8A6E', icon: Spade },
  { id: 'variado', name: 'Variado', key: '5', color: '#86EFAC', icon: Shapes },
]

export const REWARD_BY_ID = Object.fromEntries(REWARDS.map((r) => [r.id, r]))
