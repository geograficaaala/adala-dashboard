(function (global) {
  'use strict';

  const PROGRAMS = {
    atitlan_recicla: {
      id: 'atitlan_recicla',
      name: 'Atitlán Recicla',
      shortName: 'AR',
      aliases: ['atitlan recicla', 'atitlán recicla', 'cooperativa atitlan recicla', 'cooperativa atitlán recicla', 'ar']
    },
    conservando_atitlan: {
      id: 'conservando_atitlan',
      name: 'Conservando Atitlán',
      shortName: 'CA',
      aliases: ['conservando atitlan', 'conservando atitlán', 'ca']
    },
    educando_para_conservar: {
      id: 'educando_para_conservar',
      name: 'Educando para Conservar',
      shortName: 'EPC',
      aliases: ['educando para conservar', 'epc']
    },
    fortalecimiento_municipal: {
      id: 'fortalecimiento_municipal',
      name: 'Fortalecimiento Municipal',
      shortName: 'FM',
      aliases: ['fortalecimiento municipal', 'fm']
    },
    reforestacion: {
      id: 'reforestacion',
      name: 'Reforestando Atitlán',
      shortName: 'RA',
      aliases: ['reforestacion', 'reforestación', 'reforestando atitlan', 'reforestando atitlán', 'ra']
    }
  };

  const APP = {
    id: 'aala-dashboard-chatbot',
    name: 'Asistente AALA',
    subtitle: 'Consulta los CSV publicados del dashboard',
    greeting: 'Hola. Puedo responder preguntas sobre los datos publicados en el dashboard institucional y en los programas de AALA.',
    emptyState: 'Todavía no hay datos cargados para responder.',
    loadingLabel: 'Cargando información actualizada...',
    errorLabel: 'No pude cargar la información en este momento.',
    placeholder: 'Escribe una pregunta sobre indicadores, meses, programas, metas o resultados...',
    inputMaxLength: 500,
    historyLimit: 30,
    suggestionsLimit: 8
  };

  const DATA = {
    latestByDefault: true,
    includeDetailsByDefault: true,
    includeIndicatorsByDefault: true,
    includeMetadataByDefault: true,
    maxRowsPerCollection: 200,
    maxSearchResults: 25,
    refreshMode: 'manual_reload',
    dataSourceRoot: './data'
  };

  const UX = {
    defaultScope: 'all_programs',
    allowFreeText: true,
    allowOffTopicRedirect: true,
    showSuggestedQuestions: true,
    showSourcePeriod: true,
    showProgramChip: true,
    useLocalDraftPersistence: false,
    autoFocusInput: false,
    enterToSend: true,
    clearInputOnSend: true
  };

  const MODEL = {
    mode: 'local_reasoning_ready',
    backendEnabled: false,
    endpoint: '',
    timeoutMs: 30000,
    temperature: 0.2,
    maxTokens: 700
  };

  const RESPONSE_POLICY = {
    language: 'es',
    requireGroundingInData: true,
    requireProgramMentionWhenRelevant: true,
    requirePeriodMentionWhenRelevant: true,
    preferLatestPeriod: true,
    allowComparisonsAcrossPrograms: true,
    answerUnknownsClearly: true,
    declineWhenNoData: true,
    offTopicBehavior: 'redirect_to_dashboard_scope',
    forbiddenClaims: [
      'inventar cifras',
      'inventar metas',
      'afirmar datos que no aparezcan en los csv',
      'responder como si hubiera leído fuentes externas'
    ]
  };

  const INTENTS = {
    resumen: ['resumen', 'resume', 'resumir', 'síntesis', 'sintesis', 'panorama', 'overview'],
    comparacion: ['comparar', 'comparación', 'comparacion', 'versus', 'vs', 'diferencia'],
    ultimo_mes: ['último mes', 'ultimo mes', 'mes más reciente', 'mes mas reciente', 'último periodo', 'ultimo periodo', 'periodo más reciente', 'periodo mas reciente'],
    indicadores: ['indicador', 'indicadores', 'meta', 'metas', 'avance', 'cumplimiento', 'porcentaje'],
    tendencia: ['tendencia', 'evolución', 'evolucion', 'cambio', 'histórico', 'historico'],
    alerta: ['alerta', 'alertas', 'riesgo', 'riesgos', 'bajo meta', 'rezago'],
    territorio: ['municipio', 'municipios', 'territorio', 'territorios', 'zona', 'zonas', 'sector', 'tema', 'material']
  };

  const SUGGESTED_QUESTIONS = [
    {
      id: 'q-global-resumen',
      text: 'Dame un resumen ejecutivo del último mes disponible para todos los programas.',
      scope: 'all_programs',
      programId: null,
      intent: 'resumen'
    },
    {
      id: 'q-global-alertas',
      text: '¿Qué programas o indicadores muestran alertas o rezagos en el período más reciente?',
      scope: 'all_programs',
      programId: null,
      intent: 'alerta'
    },
    {
      id: 'q-global-comparacion',
      text: 'Compárame el período más reciente entre todos los programas.',
      scope: 'all_programs',
      programId: null,
      intent: 'comparacion'
    },
    {
      id: 'q-ar-resumen',
      text: 'Resume Atitlán Recicla con base en el último período disponible.',
      scope: 'program',
      programId: 'atitlan_recicla',
      intent: 'resumen'
    },
    {
      id: 'q-ar-materiales',
      text: '¿Qué materiales destacan en Atitlán Recicla en el último período?',
      scope: 'program',
      programId: 'atitlan_recicla',
      intent: 'territorio'
    },
    {
      id: 'q-ca-resumen',
      text: 'Resume Conservando Atitlán con base en el último período disponible.',
      scope: 'program',
      programId: 'conservando_atitlan',
      intent: 'resumen'
    },
    {
      id: 'q-epc-resumen',
      text: 'Resume Educando para Conservar con base en el último período disponible.',
      scope: 'program',
      programId: 'educando_para_conservar',
      intent: 'resumen'
    },
    {
      id: 'q-fm-resumen',
      text: 'Resume Fortalecimiento Municipal con base en el último período disponible.',
      scope: 'program',
      programId: 'fortalecimiento_municipal',
      intent: 'resumen'
    },
    {
      id: 'q-fm-sectores',
      text: '¿Qué sectores o temas resaltan en Fortalecimiento Municipal en el último período?',
      scope: 'program',
      programId: 'fortalecimiento_municipal',
      intent: 'territorio'
    },
    {
      id: 'q-refo-resumen',
      text: 'Resume Reforestando Atitlán con base en el último período disponible.',
      scope: 'program',
      programId: 'reforestacion',
      intent: 'resumen'
    },
    {
      id: 'q-refo-indicadores',
      text: '¿Cómo va Reforestando Atitlán respecto a sus indicadores más recientes?',
      scope: 'program',
      programId: 'reforestacion',
      intent: 'indicadores'
    }
  ];

  const FALLBACKS = {
    noData: 'No encontré datos suficientes en los CSV publicados para responder esa pregunta con confianza.',
    offTopic: 'Puedo ayudarte con preguntas sobre programas, indicadores, metas, períodos, territorios, materiales y resultados del dashboard.',
    ambiguous: 'Puedo responder eso mejor si lo enfoco por programa, indicador o período.',
    stale: 'Los datos dependen de los CSV publicados más recientemente en el dashboard.'
  };

  function stripAccents(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function normalizeText(value) {
    return stripAccents(value)
      .toLowerCase()
      .replace(/[_|/]+/g, ' ')
      .replace(/[^a-z0-9áéíóúüñ\s.-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function resolveProgramFromText(text) {
    const normalized = normalizeText(text);
    if (!normalized) return null;
    for (const program of Object.values(PROGRAMS)) {
      if (normalizeText(program.name) === normalized) return program.id;
      if (program.aliases.some((alias) => normalized.includes(normalizeText(alias)))) return program.id;
    }
    return null;
  }

  function detectIntents(text) {
    const normalized = normalizeText(text);
    const matches = [];
    Object.entries(INTENTS).forEach(([intent, words]) => {
      if (words.some((word) => normalized.includes(normalizeText(word)))) matches.push(intent);
    });
    return matches;
  }

  function getProgramLabel(programId) {
    return PROGRAMS[programId]?.name || null;
  }

  function getSuggestedQuestions(programId = null) {
    if (!programId) return SUGGESTED_QUESTIONS.slice(0, APP.suggestionsLimit);
    const scoped = SUGGESTED_QUESTIONS.filter((item) => !item.programId || item.programId === programId);
    return scoped.slice(0, APP.suggestionsLimit);
  }

  function buildSystemInstruction() {
    const programList = Object.values(PROGRAMS).map((program) => program.name).join(', ');
    return [
      'Eres un asistente de datos del dashboard AALA.',
      'Solo puedes responder con base en los CSV publicados y cargados en la aplicación.',
      'Debes priorizar el período más reciente disponible, salvo que la pregunta pida otro período.',
      'Cuando la pregunta trate sobre un programa específico, menciona explícitamente el nombre del programa.',
      'Cuando uses cifras o indicadores, menciona el período de referencia si está disponible.',
      'Si no hay datos suficientes, dilo claramente y no inventes contenido.',
      `Programas disponibles: ${programList}.`,
      'Puedes resumir, comparar, identificar alertas, describir tendencias y responder preguntas por territorio, material, sector o tema cuando esos datos existan.'
    ].join(' ');
  }

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  global.ChatbotConfig = {
    APP: clone(APP),
    DATA: clone(DATA),
    UX: clone(UX),
    MODEL: clone(MODEL),
    PROGRAMS: clone(PROGRAMS),
    INTENTS: clone(INTENTS),
    RESPONSE_POLICY: clone(RESPONSE_POLICY),
    SUGGESTED_QUESTIONS: clone(SUGGESTED_QUESTIONS),
    FALLBACKS: clone(FALLBACKS),
    normalizeText,
    resolveProgramFromText,
    detectIntents,
    getProgramLabel,
    getSuggestedQuestions,
    buildSystemInstruction,
    getState() {
      return {
        app: clone(APP),
        data: clone(DATA),
        ux: clone(UX),
        model: clone(MODEL),
        programs: clone(PROGRAMS),
        suggestedQuestions: clone(SUGGESTED_QUESTIONS)
      };
    }
  };
})(window);
