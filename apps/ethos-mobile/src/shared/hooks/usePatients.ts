import { useState } from 'react';

export interface Patient {
    id: string;
    name: string;
    lastSession: string;
    status: 'active' | 'inactive';
}

const dummyPatients: Patient[] = [
    { id: '1', name: 'Alana Gomes', lastSession: 'Há 2 dias', status: 'active' },
    { id: '2', name: 'Carlos Mendes', lastSession: 'Semana passada', status: 'active' },
    { id: '3', name: 'João Silva', lastSession: 'Hoje', status: 'active' },
    { id: '4', name: 'Maria Antônia', lastSession: 'Hoje', status: 'active' },
    { id: '5', name: 'Paulo Souza', lastSession: 'Há 1 mês', status: 'inactive' },
    { id: '6', name: 'Roberta Lima', lastSession: 'Ontem', status: 'active' },
];

export function usePatients() {
    const [patients] = useState<Patient[]>(dummyPatients);
    const isLoading = false;
    const error: string | null = null;

    function reload() {
        // No-op for local data; replace with API call when backend is ready
    }

    return { patients, isLoading, error, reload };
}
