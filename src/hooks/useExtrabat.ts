import { supabase } from '../services/supabaseApi';

interface ExtrabatResponse {
  success: boolean;
  data?: any;
  error?: string;
  technicianResults?: Array<{
    techCode: string;
    success: boolean;
    error?: any;
    data?: any;
  }>;
}

export const useExtrabat = () => {
  const createAppointment = async (
    technicianCodes: string[],
    interventionData: {
      clientName: string;
      systemType: string;
      problemDesc: string;
      startedAt: string;
      endedAt?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    },
    clientId?: number
  ): Promise<ExtrabatResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          technicianCodes,
          interventionData,
          clientId
        }
      });

      if (error) {
        console.error('Erreur Supabase:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Erreur Extrabat:', data.error);
        return { success: false, error: data.error };
      }

      return {
        success: true,
        data: data.data,
        technicianResults: data.technicianResults
      };

    } catch (error) {
      console.error('Erreur création RDV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const updateAppointment = async (
    extrabatAppointmentId: string,
    technicianCodes: string[],
    interventionData: {
      clientName: string;
      systemType: string;
      problemDesc: string;
      startedAt: string;
      endedAt?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    },
    clientId?: number
  ): Promise<ExtrabatResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          technicianCodes,
          interventionData,
          clientId,
          extrabatAppointmentId
        }
      });

      if (error) return { success: false, error: error.message };
      if (!data.success) return { success: false, error: data.error };

      return {
        success: true,
        data: data.data,
        technicianResults: data.technicianResults
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const deleteAppointment = async (
    extrabatAppointmentId: string
  ): Promise<ExtrabatResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          action: 'deleteAppointment',
          appointmentId: extrabatAppointmentId
        }
      });

      if (error) return { success: false, error: error.message };
      if (!data.success) return { success: false, error: data.error };

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  return { createAppointment, updateAppointment, deleteAppointment };
};
