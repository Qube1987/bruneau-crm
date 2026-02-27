import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProspectImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ProspectRow {
  civilite?: string;
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
}

const ProspectImportModal: React.FC<ProspectImportModalProps> = ({ onClose, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResults(null);
    }
  };

  const normalizeColumnName = (name: string): string => {
    return (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const parseFile = async (file: File): Promise<ProspectRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let prospects: ProspectRow[] = [];

          if (file.name.endsWith('.csv')) {
            const text = data as string;
            const lines = text.split('\n');
            const headers = lines[0].split(/[,;]/).map(h => normalizeColumnName(h));

            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const values = lines[i].split(/[,;]/);
              const prospect: any = {};

              headers.forEach((header, index) => {
                const value = values[index]?.trim() || '';
                if (header.includes('civilite')) prospect.civilite = value;
                else if (header.includes('nom')) prospect.nom = value;
                else if (header.includes('prenom')) prospect.prenom = value;
                else if (header.includes('email') || header.includes('mail')) prospect.email = value;
                else if (header.includes('telephone') || header.includes('tel')) prospect.telephone = value;
                else if (header.includes('adresse')) prospect.adresse = value;
                else if (header.includes('code') && header.includes('postal')) prospect.code_postal = value;
                else if (header.includes('ville')) prospect.ville = value;
              });

              if (prospect.nom) {
                prospects.push(prospect as ProspectRow);
              }
            }
          } else {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (jsonData.length < 2) {
              reject(new Error('Le fichier ne contient pas de données'));
              return;
            }

            const headers = jsonData[0].map((h: string) => normalizeColumnName(h));

            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || row.length === 0) continue;

              const prospect: any = {};

              headers.forEach((header, index) => {
                const value = row[index]?.toString().trim() || '';
                if (header.includes('civilite')) prospect.civilite = value;
                else if (header.includes('nom')) prospect.nom = value;
                else if (header.includes('prenom')) prospect.prenom = value;
                else if (header.includes('email') || header.includes('mail')) prospect.email = value;
                else if (header.includes('telephone') || header.includes('tel')) prospect.telephone = value;
                else if (header.includes('adresse')) prospect.adresse = value;
                else if (header.includes('code') && header.includes('postal')) prospect.code_postal = value;
                else if (header.includes('ville')) prospect.ville = value;
              });

              if (prospect.nom) {
                prospects.push(prospect as ProspectRow);
              }
            }
          }

          resolve(prospects);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const prospects = await parseFile(file);

      if (prospects.length === 0) {
        errors.push('Aucun prospect valide trouvé dans le fichier');
        setImportResults({ success: 0, errors });
        setIsProcessing(false);
        return;
      }

      const { createProspect } = await import('../services/supabaseApi');

      for (let i = 0; i < prospects.length; i++) {
        const prospect = prospects[i];
        try {
          await createProspect({
            ...prospect,
            actif: true,
            source: 'prospection',
          });
          successCount++;
        } catch (error) {
          errors.push(`Ligne ${i + 2}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      setImportResults({ success: successCount, errors });

      if (successCount > 0) {
        setTimeout(() => {
          onImportComplete();
          if (errors.length === 0) {
            onClose();
          }
        }, 2000);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Erreur lors du traitement du fichier');
      setImportResults({ success: 0, errors });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Importer des prospects</h2>
              <p className="text-sm text-gray-600">
                Fichier CSV ou Excel (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Format attendu
            </h3>
            <p className="text-sm text-blue-800 mb-2">
              Le fichier doit contenir les colonnes suivantes (les noms exacts peuvent varier) :
            </p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><strong>Civilité</strong> (optionnel) - Ex: Monsieur, Madame</li>
              <li><strong>Nom</strong> (requis)</li>
              <li><strong>Prénom</strong> (optionnel)</li>
              <li><strong>Email</strong> (optionnel)</li>
              <li><strong>Téléphone</strong> (optionnel)</li>
              <li><strong>Adresse</strong> (optionnel)</li>
              <li><strong>Code postal</strong> (optionnel)</li>
              <li><strong>Ville</strong> (optionnel)</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un fichier
            </label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Fichier sélectionné : {file.name}
              </p>
            )}
          </div>

          {importResults && (
            <div className={`border rounded-lg p-4 ${importResults.errors.length === 0
                ? 'bg-green-50 border-green-200'
                : importResults.success > 0
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}>
              {importResults.success > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-medium text-green-900">
                    {importResults.success} prospect{importResults.success > 1 ? 's' : ''} importé{importResults.success > 1 ? 's' : ''} avec succès
                  </p>
                </div>
              )}
              {importResults.errors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="font-medium text-red-900">
                      {importResults.errors.length} erreur{importResults.errors.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {importResults.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-800 ml-7">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {importResults && importResults.success > 0 ? 'Fermer' : 'Annuler'}
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isProcessing ? 'Import en cours...' : 'Importer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProspectImportModal;
