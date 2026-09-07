export interface VozNarrador {
  id: string;
  modelo: string;
  speakerId?: number;
  label: string;
  hint: string;
  acento: "Argentina" | "México" | "España";
  calidad: "Alta" | "Media" | "Ligera" | "Muy ligera";
  descargaMb: number;
}

export const VOCES: VozNarrador[] = [
  {
    id: "es_AR-daniela-high",
    modelo: "es_AR-daniela-high",
    label: "Daniela",
    hint: "La voz argentina oficial de Piper, entrenada en español rioplatense.",
    acento: "Argentina",
    calidad: "Alta",
    descargaMb: 109,
  },
  {
    id: "es_MX-claude-high",
    modelo: "es_MX-claude-high",
    label: "Claude",
    hint: "Voz mexicana de máxima calidad para una narración detallada.",
    acento: "México",
    calidad: "Alta",
    descargaMb: 60,
  },
  {
    id: "es_MX-ald-medium",
    modelo: "es_MX-ald-medium",
    label: "Ald",
    hint: "Voz mexicana equilibrada, clara y más rápida de preparar.",
    acento: "México",
    calidad: "Media",
    descargaMb: 60,
  },
  {
    id: "es_MX-ald-x_low",
    modelo: "es_MX-ald-x_low",
    label: "Ald ligera",
    hint: "La alternativa mexicana más liviana para equipos modestos.",
    acento: "México",
    calidad: "Muy ligera",
    descargaMb: 20,
  },
  {
    id: "es_ES-davefx-medium",
    modelo: "es_ES-davefx-medium",
    label: "DaveFX",
    hint: "Voz castellana clara y equilibrada.",
    acento: "España",
    calidad: "Media",
    descargaMb: 60,
  },
  {
    id: "es_ES-carlfm-x_low",
    modelo: "es_ES-carlfm-x_low",
    label: "CarlFM",
    hint: "Voz castellana muy liviana y de descarga rápida.",
    acento: "España",
    calidad: "Muy ligera",
    descargaMb: 27,
  },
  {
    id: "es_ES-mls_10246-low",
    modelo: "es_ES-mls_10246-low",
    label: "MLS 10246",
    hint: "Voz individual de España, versión ligera.",
    acento: "España",
    calidad: "Ligera",
    descargaMb: 60,
  },
  {
    id: "es_ES-mls_9972-low",
    modelo: "es_ES-mls_9972-low",
    label: "MLS 9972",
    hint: "Segunda voz individual de España, versión ligera.",
    acento: "España",
    calidad: "Ligera",
    descargaMb: 60,
  },
  {
    id: "es_ES-sharvard-medium-m",
    modelo: "es_ES-sharvard-medium",
    speakerId: 0,
    label: "Sharvard — masculina",
    hint: "Hablante masculino confirmado del modelo castellano Sharvard.",
    acento: "España",
    calidad: "Media",
    descargaMb: 73,
  },
  {
    id: "es_ES-sharvard-medium-f",
    modelo: "es_ES-sharvard-medium",
    speakerId: 1,
    label: "Sharvard — femenina",
    hint: "Hablante femenino confirmado del modelo castellano Sharvard.",
    acento: "España",
    calidad: "Media",
    descargaMb: 73,
  },
];

export const ACENTOS_DISPONIBLES: VozNarrador["acento"][] = ["Argentina", "México", "España"];
export const VOZ_POR_DEFECTO = "es_MX-claude-high";

export function buscarVoz(id: string): VozNarrador {
  const encontrada = VOCES.find((voz) => voz.id === id);
  return encontrada ?? {
    id: "es_MX-claude-high",
    modelo: "es_MX-claude-high",
    label: "Claude",
    hint: "Voz mexicana de máxima calidad para una narración detallada.",
    acento: "México",
    calidad: "Alta",
    descargaMb: 60,
  };
}