export type CategoryType = 'daily' | 'tea' | 'mahjong';
export type RecordType = 'income' | 'expense';

export interface BaseRecord {
    id: string;
    date: string; // YYYY-MM-DD
    category: CategoryType;
    amount: number;
    createdAt: string;
    year: number;
    note?: string;
}

export interface DailyRecord extends BaseRecord {
    category: 'daily';
    type: RecordType;
    subCategory: string;
}

export interface TeaRecord extends BaseRecord {
    category: 'tea';
    shop: string;
    item: string;
    sugar: string;
    ice: string;
    rating: number;
}

export interface MahjongRecord extends BaseRecord {
    category: 'mahjong';
    isWin: boolean;
    players: string[];
}

export type AppRecord = DailyRecord | TeaRecord | MahjongRecord;

export interface CategoryConfig {
    expense: string[];
    income: string[];
}

export interface ConfirmDialogState {
    isOpen: boolean;
    message: string;
    onConfirm: (() => void) | null;
    isDestructive: boolean;
}

export interface NotificationState {
    msg: string;
    type: 'success' | 'error' | 'add' | 'delete' | 'edit';
}
