(() => {
  if (window.__cfDashboardEnhancementsLoaded) return;
  window.__cfDashboardEnhancementsLoaded = true;

  const SPREADSHEET_ID = "1dAAisvUXYx3B0ItRv0qRBFK2RvA7wNRow7fXRYDSNkU";
  const GERAL_GID = "523680567";
  const INFO_MONTH_ID = "cf-last-change-month";
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  let lastRenderedValue = "";

  const normalizeText = (value) => (value || "").replace(/\s+/g, " ").trim();

  const formatDateTime = (value) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return normalizeText(String(value));
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const buildGvizUrl = () =>
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${GERAL_GID}&range=C2&headers=0`;

  const parseGvizResponse = (text) => {
    const start = text.indexOf("(");
    const end = text.lastIndexOf(")");

    if (start === -1 || end === -1) {
      throw new Error("Resposta inv\u00e1lida do Google Sheets.");
    }

    return JSON.parse(text.slice(start + 1, end));
  };

  const readCellValue = (payload) => {
    const cell = payload?.table?.rows?.[0]?.c?.[0];
    if (!cell) return "";

    if (typeof cell.f === "string" && normalizeText(cell.f)) {
      return normalizeText(cell.f);
    }

    if (typeof cell.v === "string" && normalizeText(cell.v)) {
      return formatDateTime(cell.v);
    }

    if (typeof cell.v === "number") {
      return formatDateTime(cell.v);
    }

    return "";
  };

  const getMonthHeading = () =>
    Array.from(document.querySelectorAll("h2")).find((heading) => {
      const text = normalizeText(heading.textContent);
      return /^(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s+\d{4}$/i.test(text);
    }) || null;

  const ensureMonthInfo = () => {
    const monthHeading = getMonthHeading();
    const monthRow = monthHeading?.parentElement;
    const monthWrapper = monthRow?.parentElement;
    if (!monthHeading || !monthRow || !monthWrapper) return null;

    let info = document.getElementById(INFO_MONTH_ID);
    if (!info) {
      info = document.createElement("p");
      info.id = INFO_MONTH_ID;
      info.className = "text-xs sm:text-sm text-slate-500 leading-snug sm:text-right";
      monthWrapper.appendChild(info);
    }

    return info;
  };

  const renderLastChange = () => {
    const monthInfo = ensureMonthInfo();
    if (!monthInfo) return;

    monthInfo.textContent = lastRenderedValue
      ? `\u00daltima mudan\u00e7a detectada: ${lastRenderedValue}`
      : "";
  };

  const fetchLastChange = async () => {
    const response = await fetch(buildGvizUrl());
    if (!response.ok) {
      throw new Error("N\u00e3o foi poss\u00edvel ler a data da aba Geral.");
    }

    const text = await response.text();
    const payload = parseGvizResponse(text);
    return readCellValue(payload);
  };

  const syncLastChange = async () => {
    try {
      const value = await fetchLastChange();
      lastRenderedValue = value;
      renderLastChange();
    } catch {
      renderLastChange();
    }
  };

  const start = () => {
    renderLastChange();
    window.setInterval(renderLastChange, 1200);
    void syncLastChange();
    window.setInterval(() => {
      void syncLastChange();
    }, REFRESH_INTERVAL_MS);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
