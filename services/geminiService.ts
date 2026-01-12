
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, OEMEquipment } from "../types";

export const generateTechnicalReport = async (project: ProjectData, equipment: OEMEquipment[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const stats = {
    peak: Math.max(...project.hourlyLoads),
    totalMWh: project.hourlyLoads.reduce((a, b) => a + b, 0) / 1000,
    avgEer: equipment.reduce((a, b) => a + b.eer, 0) / (equipment.length || 1),
    totalCost: equipment.reduce((a, b) => a + b.price, 0)
  };

  const mainUnit = equipment.length === 1 ? equipment[0] : null;

  const prompt = `Aja como um Engenheiro Sénior de AVAC da Koelho2000 Engenharia. Gere um Relatório Técnico de Seleção Profissional em Português (PT-PT) para o projeto "${project.projectName}".

  REFERÊNCIA DA OBRA: ${project.workReference}
  CLIENTE: ${project.clientName}
  INSTALAÇÃO: ${project.installationName}
  LOCAL: ${project.location}
  AUDITORES: ${project.auditCompany}

  CREDENCIAIS DO ENGENHEIRO (DEVE APARECER NO INÍCIO):
  José Coelho | PQ00851 | OET 2321 | TSCE02501 | CONSULTOR AQUA+ AQ0222
  NIF: PT513183647
  Contacto: +351 934 021 666 | koelho2000@gmail.com

  REGRAS DE FORMATAÇÃO CRÍTICAS:
  1. PROIBIDO o uso de asteriscos (*), cardinais (#) ou qualquer símbolo de Markdown.
  2. O texto deve ser LIMPO, estruturado apenas por parágrafos e TÍTULOS EM MAIÚSCULAS.
  3. Use o marcador [QUEBRA_DE_PAGINA] para separar cada folha A4.
  4. Linguagem técnica rigorosa e formal.

  DADOS DO PROJETO:
  - Carga de Pico: ${stats.peak.toFixed(2)} kW
  - Energia Anual Estimada: ${stats.totalMWh.toFixed(2)} MWh
  - Temperatura de Saída Fluid: ${project.targetTemperature} °C
  ${mainUnit ? `- EQUIPAMENTO SELECIONADO: ${mainUnit.brand} ${mainUnit.model}` : `- EQUIPAMENTOS EM ANÁLISE: ${equipment.map(e => `${e.brand} ${e.model}`).join(', ')}`}

  ESTRUTURA DO DOCUMENTO (GERE PELO MENOS 6 PÁGINAS):
  PÁGINA 1: CAPA. Título centralizado: RELATÓRIO TÉCNICO DE SELECÇÃO HVAC. Referência da Obra, Nome do projeto, Cliente, Localidade, Engenheiro Responsável.
  PÁGINA 2: ÍNDICE GERAL. Listagem de capítulos e sub-capítulos.
  PÁGINA 3: INTRODUÇÃO E ENQUADRAMENTO. Descrição das necessidades térmicas e condições ambientais da instalação.
  PÁGINA 4: ANÁLISE DINÂMICA DE CARGA. Comentário sobre a variabilidade horária e picos térmicos simulados (8760h).
  PÁGINA 5: MEMÓRIA DESCRITIVA DA SOLUÇÃO. Justificação técnica da escolha e análise de eficiência part-load.
  PÁGINA 6: CONCLUSÃO E PARECER TÉCNICO FINAL. Assinatura profissional de José Coelho.

  Gere o relatório agora seguindo estas instruções de forma impecável.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        maxOutputTokens: 20000,
        thinkingConfig: { thinkingBudget: 15000 },
        temperature: 0.7
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro no relatório:", error);
    return "Falha ao gerar o relatório profissional.";
  }
};
