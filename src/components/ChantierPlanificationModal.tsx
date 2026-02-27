import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, User, Calendar } from 'lucide-react';
import { TimeSelector } from './TimeSelector';
import { supabaseApi, Chantier, SalarieUser, ChantierIntervention } from '../services/supabaseApi';
import { useExtrabat } from '../hooks/useExtrabat';

interface ChantierPlanificationModalProps {
  chantier: Chantier;
  onClose: () => void;
  onSuccess: () => void;
}

interface InterventionForm {
  id?: string;
  started_at: string;
  ended_at: string;
  notes: string;
  technician_ids: string[];
}

const ChantierPlanificationModal: React.FC<ChantierPlanificationModalProps> = ({
  chantier,
  onClose,
  onSuccess
}) => {
  const [salaries, setSalaries] = useState<SalarieUser[]>([]);
  const [interventions, setInterventions] = useState<InterventionForm[]>([]);
  const [existingInterventions, setExistingInterventions] = useState<ChantierIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { createAppointment, updateAppointment, deleteAppointment } = useExtrabat();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salariesList, interventionsList] = await Promise.all([
        supabaseApi.getSalaries(),
        supabaseApi.getChantierInterventions(chantier.id)
      ]);

      setSalaries(salariesList);
      setExistingInterventions(interventionsList);

      if (interventionsList.length > 0) {
        setInterventions(
          interventionsList.map(int => ({
            id: int.id,
            started_at: formatDateTimeForInput(int.started_at),
            ended_at: int.ended_at ? formatDateTimeForInput(int.ended_at) : '',
            notes: int.notes || '',
            technician_ids: int.technician_ids || []
          }))
        );
      } else {
        addNewIntervention();
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTimeForInput = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const roundToNearest15Minutes = (date: Date): Date => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const newDate = new Date(date);
    newDate.setMinutes(roundedMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };

  const addNewIntervention = () => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    const endTime = new Date(now);
    endTime.setHours(17, 0, 0, 0);

    setInterventions([
      ...interventions,
      {
        started_at: formatDateTimeForInput(now),
        ended_at: formatDateTimeForInput(endTime),
        notes: '',
        technician_ids: []
      }
    ]);
  };

  const removeIntervention = (index: number) => {
    if (interventions.length === 1) {
      alert('Vous devez conserver au moins une journée d\'intervention');
      return;
    }
    const newInterventions = interventions.filter((_, i) => i !== index);
    setInterventions(newInterventions);
  };

  const updateIntervention = (index: number, field: keyof InterventionForm, value: string) => {
    const newInterventions = [...interventions];
    const intervention = newInterventions[index];

    if (field === 'started_at') {
      const startDate = new Date(value);
      const endDate = new Date(startDate);
      endDate.setHours(17, 0, 0, 0);

      newInterventions[index] = {
        ...intervention,
        started_at: value,
        ended_at: formatDateTimeForInput(endDate)
      };
    } else {
      newInterventions[index] = {
        ...intervention,
        [field]: value
      };
    }

    setInterventions(newInterventions);
  };

  const toggleTechnician = (interventionIndex: number, technicianId: string) => {
    const newInterventions = [...interventions];
    const intervention = newInterventions[interventionIndex];

    if (intervention.technician_ids.includes(technicianId)) {
      intervention.technician_ids = intervention.technician_ids.filter(id => id !== technicianId);
    } else {
      intervention.technician_ids = [...intervention.technician_ids, technicianId];
    }

    setInterventions(newInterventions);
  };

  const handleSubmit = async () => {
    if (interventions.length === 0) {
      alert('Veuillez ajouter au moins une journée d\'intervention');
      return;
    }

    for (let i = 0; i < interventions.length; i++) {
      const intervention = interventions[i];

      if (!intervention.started_at) {
        alert('Veuillez renseigner toutes les dates de début');
        return;
      }

      if (intervention.technician_ids.length === 0) {
        alert(`Veuillez sélectionner au moins un technicien pour la journée ${i + 1}`);
        return;
      }
    }

    setIsSaving(true);

    try {
      const prospect = chantier.opportunite?.prospect;
      const clientName = prospect ? `${prospect.nom} ${prospect.prenom || ''}`.trim() : 'Client';
      const systemType = chantier.opportunite?.titre || 'Chantier';
      const address = prospect?.adresse || '';

      for (let i = 0; i < interventions.length; i++) {
        const intervention = interventions[i];
        const startedAtISO = new Date(intervention.started_at).toISOString();
        const endedAtISO = intervention.ended_at ? new Date(intervention.ended_at).toISOString() : undefined;

        const selectedSalaries = salaries.filter(s => intervention.technician_ids.includes(s.id));
        const technicianCodesForExtrabat = selectedSalaries
          .filter(s => s.extrabat_id)
          .map(s => s.extrabat_id!.toString());

        let extrabatAppointmentId: string | undefined;

        if (technicianCodesForExtrabat.length > 0) {
          const existingIntervention = existingInterventions[i];

          if (existingIntervention?.extrabat_appointment_id) {
            const result = await updateAppointment(
              existingIntervention.extrabat_appointment_id,
              technicianCodesForExtrabat,
              {
                clientName,
                systemType,
                problemDesc: intervention.notes || 'Intervention chantier',
                startedAt: startedAtISO,
                endedAt: endedAtISO,
                address
              },
              prospect?.extrabat_id
            );

            if (result.success) {
              extrabatAppointmentId = existingIntervention.extrabat_appointment_id;
              console.log('✅ RDV Extrabat mis à jour avec', technicianCodesForExtrabat.length, 'intervenant(s)');
            } else {
              console.error('❌ Erreur mise à jour RDV Extrabat:', result.error);
            }
          } else {
            const result = await createAppointment(
              technicianCodesForExtrabat,
              {
                clientName,
                systemType,
                problemDesc: intervention.notes || 'Intervention chantier',
                startedAt: startedAtISO,
                endedAt: endedAtISO,
                address
              },
              prospect?.extrabat_id
            );

            if (result.success && result.data?.id) {
              extrabatAppointmentId = result.data.id.toString();
              console.log('✅ RDV Extrabat créé:', extrabatAppointmentId, 'avec', technicianCodesForExtrabat.length, 'intervenant(s)');
            } else {
              console.error('❌ Erreur création RDV Extrabat:', result.error);
            }
          }
        }

        if (intervention.id) {
          await supabaseApi.updateChantierIntervention(intervention.id, {
            started_at: startedAtISO,
            ended_at: endedAtISO,
            technician_ids: intervention.technician_ids,
            notes: intervention.notes || null,
            extrabat_appointment_id: extrabatAppointmentId
          });
        } else {
          await supabaseApi.createChantierIntervention({
            chantier_id: chantier.id,
            started_at: startedAtISO,
            ended_at: endedAtISO,
            technician_ids: intervention.technician_ids,
            notes: intervention.notes || null,
            extrabat_appointment_id: extrabatAppointmentId
          });
        }
      }

      const interventionsToDelete = existingInterventions.slice(interventions.length);
      for (const intervention of interventionsToDelete) {
        if (intervention.extrabat_appointment_id) {
          await deleteAppointment(intervention.extrabat_appointment_id);
        }
        await supabaseApi.deleteChantierIntervention(intervention.id);
      }

      await supabaseApi.updateChantier(chantier.id, {
        chantier_planifie: true,
        date_chantier_planifie: new Date().toISOString()
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la planification');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Planification du chantier
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {chantier.opportunite?.prospect?.nom} {chantier.opportunite?.prospect?.prenom || ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 inline mr-2" />
                Journées d'intervention
              </label>
              <button
                onClick={addNewIntervention}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter une journée
              </button>
            </div>

            <div className="space-y-4">
              {interventions.map((intervention, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Journée {index + 1}
                    </h4>
                    <button
                      onClick={() => removeIntervention(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer cette journée"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="h-4 w-4 inline mr-2" />
                        Techniciens affectés
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                        {salaries.map((salarie) => (
                          <label
                            key={salarie.id}
                            className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={intervention.technician_ids.includes(salarie.id)}
                              onChange={() => toggleTechnician(index, salarie.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              {salarie.display_name || salarie.email}
                              {salarie.extrabat_id && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (Extrabat: {salarie.extrabat_id})
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                      {intervention.technician_ids.length === 0 && (
                        <p className="mt-1 text-xs text-red-600">
                          Aucun technicien sélectionné
                        </p>
                      )}
                    </div>

                    <TimeSelector
                      label="Début d'intervention"
                      value={intervention.started_at}
                      onChange={(value) => updateIntervention(index, 'started_at', value)}
                      required
                    />

                    <TimeSelector
                      label="Fin d'intervention"
                      value={intervention.ended_at}
                      onChange={(value) => updateIntervention(index, 'ended_at', value)}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes d'intervention
                      </label>
                      <textarea
                        value={intervention.notes}
                        onChange={(e) => updateIntervention(index, 'notes', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-sm"
                        placeholder="Consignes, matériel nécessaire, etc."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Enregistrer la planification</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChantierPlanificationModal;
