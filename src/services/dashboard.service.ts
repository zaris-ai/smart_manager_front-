import apiClient from '@/lib/axios';
import { DashboardApiResponse, DashboardSummary } from '@/types/dashboard';

const unwrapMessage = (error: unknown, fallback: string): string => {
    const err = error as {
        response?: {
            data?: {
                message?: string;
            };
        };
        message?: string;
    };

    return err.response?.data?.message || err.message || fallback;
};

export const dashboardService = {
    async getSummary(): Promise<DashboardSummary> {
        try {
            const response = await apiClient.get<DashboardApiResponse>(
                '/dashboard/summary',
            );

            if (!response.data.data) {
                throw new Error('پاسخ داشبورد معتبر نیست.');
            }

            return response.data.data;
        } catch (error) {
            throw new Error(unwrapMessage(error, 'خطا در دریافت اطلاعات داشبورد'));
        }
    },
};