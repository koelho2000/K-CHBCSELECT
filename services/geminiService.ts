
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, OEMEquipment } from "../types";

export const generateTechnicalReport = async (project: ProjectData, equipment: OEMEquipment[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const stats = {
    peak: Math.max(...project.hourlyLoads),
    totalMWh: project.hourlyLoads.reduce((a, b) => a + b, 0) / 1000,
    avgEer: equipment.reduce((a, b) => a + b.eer, 0) / equipment.length,
    totalCost: equipment.reduce((a, b) => a + b.price, 0)
  };

  const prompt = `Aja como um Engenheiro Sénior de AVAC da Koelho2000. Gere um Relatório Técnico de Seleção Profissional em Português (PT-PT) para o projeto "${project.projectName}".

  DADOS DO PROJETO:
  - Localização: ${project.location}
  - Cliente: ${project.clientName}
  - Empresa: ${project.companyName}
  - Técnico: ${project.technicianName}
  - Carga de Pico: ${stats.peak.toFixed(2)} kW
  - Energia Anual Estimada: ${stats.totalMWh.toFixed(2)} MWh
  - Temperatura de Projeto: ${project.targetTemperature} °C
  - Investimento Estimado: ${stats.totalCost.toLocaleString('pt-PT')} €
  - Equipamentos Selecionados: ${equipment.map(e => `${e.brand} ${e.model} (${e.coolingCapacity}kW, ${e.refrigerant}, ESEER: ${e.eseer})`).join(', ')}
  - Componentes: Válvulas (${project.valves.join(', ')}), Instrumentação (${project.instrumentation.join(', ')})
  - Controlo: ${project.controlType}

  ESTRUTURA OBRIGATÓRIA (Use Markdown com HTML para cores e tabelas):
  1. CAPA: Título, Versão, Data, Logótipo Koelho2000 (simulado), Dados Administrativos.
  2. ÍNDICE: Estrutura clicável.
  3. INTRODUÇÃO: Objetivos do projeto e enquadramento.
  4. ANÁLISE DE CARGA: Comentário sobre o perfil de 8760h e estacionalidade.
  5. MEMÓRIA DESCRITIVA: Detalhes técnicos da solução (Fluido, Compressores, Eficiência).
  6. TABELA COMPARATIVA TÉCNICA: Tabela formatada com indicadores chave.
  7. ANÁLISE ECONÓMICA: Mapa de investimento detalhado e ROI qualitativo.
  8. CONCLUSÃO: Justificação final da escolha técnica.
  9. CONTRA-CAPA: Contactos Koelho2000.

  FORMATAÇÃO: Use um tom extremamente profissional, técnico e rigoroso. Evite generalidades. Analise especificamente os dados fornecidos.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        thinkingConfig: { thinkingBudget: 8000 },
        temperature: 0.7
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro no relatório:", error);
    return "Falha ao gerar o relatório. Verifique a chave de API ou tente novamente.";
  }
};

export const suggestEquipment = async (project: ProjectData, database: OEMEquipment[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dbSnippet = database.map(e => ({
    id: e.id,
    name: `${e.brand} ${e.model}`,
    cap: e.coolingCapacity,
    eseer: e.eseer,
    refr: e.refrigerant,
    price: e.price
  })).slice(0, 50);

  const prompt = `Analise os requisitos do projeto HVAC e sugira os 3 melhores equipamentos da lista abaixo.
  
  Requisitos:
  - Carga Térmica: ${project.peakPower} kW
  - Temperatura de Saída: ${project.targetTemperature} °C
  - Nível de Eficiência Pretendida: ${project.targetEfficiency}
  
  Dados OEM (Top 50):
  ${JSON.stringify(dbSnippet)}
  
  Retorne um JSON contendo uma lista de sugestões com o ID do equipamento e a justificativa técnica profissional.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["id", "reason"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });
    return JSON.parse(response.text || '{"suggestions":[]}');
  } catch (error) {
    console.error("Erro na sugestão IA:", error);
    return { suggestions: [] };
  }
};
