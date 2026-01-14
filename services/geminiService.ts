
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

  const mainUnit = equipment.length > 0 ? equipment[0] : null;

  const prompt = `Aja como um Engenheiro Sénior de AVAC da Koelho2000 Engenharia. 
  Gere um Parecer Técnico estruturado para o projeto "${project.projectName}".
  
  ESTRUTURA OBRIGATÓRIA DO TEXTO:
  O seu texto deve ser dividido EXACTAMENTE em 6 blocos, cada um começando com a tag [SECCAO_X] e terminando com a tag [RODAPE_X].
  
  [SECCAO_1]: Introdução e Enquadramento do Projeto.
  [RODAPE_1]: Uma análise técnica de 2 frases sobre a localização (${project.location}).
  
  [SECCAO_2]: Análise Climática. Comente as condições de ${project.selectedDistrict}.
  [RODAPE_2]: Comentário sobre o risco de geada ou picos de calor extremo.
  
  [SECCAO_3]: Perfil de Carga 8760h. Analise o pico de ${stats.peak.toFixed(1)} kW e a energia de ${stats.totalMWh.toFixed(1)} MWh.
  [RODAPE_3]: Análise do factor de carga e modulação necessária.
  
  [SECCAO_4]: Justificação da Selecção OEM. Fale sobre os modelos: ${equipment.map(e => e.model).join(', ')}.
  [RODAPE_4]: Comparativo de robustez entre as marcas seleccionadas.
  
  [SECCAO_5]: Performance e Eficiência Dinâmica. Comente o SEER/SCOP projectado.
  [RODAPE_5]: Impacto ambiental e redução de pegada de carbono.
  
  [SECCAO_6]: Conclusão e Parecer Final de José Coelho.
  [RODAPE_6]: Certificação profissional e validade do parecer.

  REGRAS:
  - Linguagem técnica rigorosa (PT-PT).
  - Use termos como "Inércia térmica", "Entalpia", "COP Nominal", "Part-load efficiency".
  - Proibido Markdown. Texto limpo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        maxOutputTokens: 15000,
        // Added thinkingBudget to comply with guidelines for Gemini 3 models when maxOutputTokens is set
        thinkingConfig: { thinkingBudget: 4000 },
        temperature: 0.6
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro no relatório:", error);
    return "Falha ao gerar o relatório profissional.";
  }
};
