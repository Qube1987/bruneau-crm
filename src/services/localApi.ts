import { Opportunite, Interaction, StatutOpportunite, TypeInteraction, StatutCloture } from '../types';

// Simulation d'une base de données locale pour les opportunités
let opportunites: Opportunite[] = [];
let interactions: Interaction[] = [];

let nextOpportuniteId = 1;
let nextInteractionId = 1;

export const localApi = {
  // Opportunités
  async getOpportunites(): Promise<Opportunite[]> {
    return opportunites;
  },

  async createOpportunite(data: Omit<Opportunite, 'id' | 'dateCreation' | 'dateModification' | 'interactions'>): Promise<Opportunite> {
    const now = new Date().toISOString();
    const newOpportunite: Opportunite = {
      ...data,
      id: nextOpportuniteId.toString(),
      dateCreation: now,
      dateModification: now,
      interactions: [],
    };
    
    opportunites.push(newOpportunite);
    nextOpportuniteId++;
    
    return newOpportunite;
  },

  async updateOpportunite(id: string, updates: Partial<Opportunite>): Promise<Opportunite> {
    const index = opportunites.findIndex(opp => opp.id === id);
    if (index === -1) {
      throw new Error('Opportunité non trouvée');
    }
    
    opportunites[index] = {
      ...opportunites[index],
      ...updates,
      dateModification: new Date().toISOString(),
    };
    
    return opportunites[index];
  },

  async cloturerOpportunite(id: string, statutCloture: StatutCloture): Promise<Opportunite> {
    return this.updateOpportunite(id, {
      statutCloture,
      dateCloture: new Date().toISOString(),
    });
  },

  // Interactions
  async createInteraction(data: Omit<Interaction, 'id' | 'date'>): Promise<Interaction> {
    const newInteraction: Interaction = {
      ...data,
      id: nextInteractionId.toString(),
      date: new Date().toISOString(),
    };
    
    interactions.push(newInteraction);
    
    // Ajouter l'interaction à l'opportunité correspondante
    const opportuniteIndex = opportunites.findIndex(opp => opp.id === data.opportuniteId);
    if (opportuniteIndex !== -1) {
      opportunites[opportuniteIndex].interactions.push(newInteraction);
      opportunites[opportuniteIndex].dateModification = new Date().toISOString();
    }
    
    nextInteractionId++;
    
    return newInteraction;
  },

  async getInteractionsByOpportunite(opportuniteId: string): Promise<Interaction[]> {
    return interactions.filter(interaction => interaction.opportuniteId === opportuniteId);
  }
};