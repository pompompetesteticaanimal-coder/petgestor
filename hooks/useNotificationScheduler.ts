
import { useEffect } from 'react';
import { Appointment, Service } from '../types';

export const useNotificationScheduler = (appointments: Appointment[], services: Service[]) => {
    useEffect(() => {
        // Request permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const checkTime = () => {
            const now = new Date();
            const day = now.getDay(); // 0=Sun, 6=Sat
            const hour = now.getHours();
            const minute = now.getMinutes();

            // Rule: Tuesday (2) to Saturday (6), at 08:30
            if (day >= 2 && day <= 6 && hour === 8 && minute === 30) {
                const todayStr = now.toISOString().split('T')[0];
                const lastSent = localStorage.getItem('petgestor_daily_notif');

                if (lastSent !== todayStr) {
                    sendDailySummary(appointments, services, todayStr);
                    localStorage.setItem('petgestor_daily_notif', todayStr);
                }
            }
        };

        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [appointments, services]);

    const sendDailySummary = (appointments: Appointment[], services: Service[], dateStr: string) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        // Calculate Stats
        const todayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado');
        const count = todayApps.length;

        let tosaCount = 0;
        todayApps.forEach(a => {
            const s = services.find(srv => srv.id === a.serviceId);
            if (s && s.name.toLowerCase().includes('tosa')) tosaCount++;
        });

        if (count === 0) return; // Don't notify if empty? Or maybe "Hoje está livre"? Let's notify stats.

        const title = "🌞 Bom dia, Deise!";
        const body = `Hoje temos ${count} clientes agendados e ${tosaCount} tosas. Bom trabalho! 🐾`;

        new Notification(title, {
            body,
            icon: '/icon.jpg', // Assuming this exists or uses default
            tag: 'daily-summary'
        });
    };
};
