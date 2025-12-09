
declare let google: any;

// ATENÇÃO: Alterado de .readonly para acesso completo para permitir salvar agendamentos
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets';
export const DEFAULT_CLIENT_ID = '283638384975-nt1pilc761qt69otu2dapf8ek0n6hvac.apps.googleusercontent.com';

export const googleService = {
  tokenClient: null as any,

  init: (callback: (tokenResponse: any) => void) => {
    if (typeof google !== 'undefined' && google.accounts) {
      const clientId = localStorage.getItem('petgestor_client_id') || DEFAULT_CLIENT_ID;
      if (!localStorage.getItem('petgestor_client_id')) {
        localStorage.setItem('petgestor_client_id', DEFAULT_CLIENT_ID);
      }

      googleService.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: callback,
      });
    } else {
      console.error('Google Identity Services script not loaded');
    }
  },

  login: (options?: { hint?: string, prompt?: string }) => {
    if (googleService.tokenClient) {
      // Use options or defaults. avoid 'consent' to prevent re-approval every time.
      const requestConfig: any = {};
      if (options?.hint) requestConfig.login_hint = options.hint;
      if (options?.prompt) requestConfig.prompt = options.prompt;

      googleService.tokenClient.requestAccessToken(requestConfig);
    } else {
      const clientId = localStorage.getItem('petgestor_client_id') || DEFAULT_CLIENT_ID;
      if (!clientId) {
        alert('ID do cliente não encontrado. Reinicie a configuração.');
        return;
      }
      alert('Sistema de login carregando... tente novamente em 2 segundos.');
    }
  },

  getUserProfile: async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile', error);
      return null;
    }
  },

  createEvent: async (accessToken: string, eventDetails: {
    summary: string;
    description: string;
    startTime: string; // ISO string
    durationMin: number;
  }) => {
    const start = new Date(eventDetails.startTime);
    const end = new Date(start.getTime() + eventDetails.durationMin * 60000);

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating calendar event', error);
      return null;
    }
  },

  updateEvent: async (accessToken: string, eventId: string, eventDetails: {
    summary: string;
    description: string;
    startTime: string;
    durationMin: number;
  }) => {
    const start = new Date(eventDetails.startTime);
    const end = new Date(start.getTime() + eventDetails.durationMin * 60000);

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating calendar event', error);
      return null;
    }
  },

  deleteEvent: async (accessToken: string, eventId: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        console.error('Failed to delete event', await response.text());
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deleting calendar event', error);
      return false;
    }
  },

  getSheetValues: async (accessToken: string, spreadsheetId: string, range: string) => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      return data.values;
    } catch (error) {
      console.error('Error fetching sheet data', error);
      throw error;
    }
  },

  appendSheetValues: async (accessToken: string, spreadsheetId: string, range: string, values: any[]) => {
    try {
      const body = {
        values: [values]
      };

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error) {
      console.error('Error appending sheet data', error);
      throw error;
    }
  },

  updateSheetValues: async (accessToken: string, spreadsheetId: string, range: string, values: any[]) => {
    try {
      const body = {
        values: [values]
      };
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating sheet data', error);
      throw error;
    }
  },

  clearSheetValues: async (accessToken: string, spreadsheetId: string, range: string) => {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error clearing sheet data', error);
      throw error;
    }
  }
};
