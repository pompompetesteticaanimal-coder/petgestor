
declare var google: any;

// Função para buscar o ID salvo ou usar o placeholder
const getClientId = () => {
  return localStorage.getItem('petgestor_client_id') || '283638384975-nt1pilc761qt69otu2dapf8ek0n6hvac.apps.googleusercontent.com';
};

const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets.readonly';

export const googleService = {
  tokenClient: null as any,
  
  init: (callback: (tokenResponse: any) => void) => {
    if (typeof google !== 'undefined' && google.accounts) {
      const clientId = getClientId();
      
      // Só inicializa se tiver um ID que não seja o placeholder padrão
      if (clientId === '283638384975-nt1pilc761qt69otu2dapf8ek0n6hvac.apps.googleusercontent.com') {
        console.warn('Google Client ID não configurado.');
        return;
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

  login: () => {
    // Verifica novamente antes de tentar logar
    const clientId = getClientId();
    if (clientId === '283638384975-nt1pilc761qt69otu2dapf8ek0n6hvac.apps.googleusercontent.com') {
        alert('Por favor, vá em Clientes > Configurações e configure seu ID do Cliente Google (OAuth) primeiro.');
        return;
    }

    if (googleService.tokenClient) {
      googleService.tokenClient.requestAccessToken();
    } else {
      // Tenta reinicializar caso o script tenha carregado depois
      alert('Serviço Google não está pronto ou ID inválido. Recarregue a página.');
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
  }
};
