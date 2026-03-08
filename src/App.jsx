import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun, CloudRain, Wind, CheckCircle2,
  MapPin, Droplets, Loader2, RefreshCw,
  Thermometer, ChevronDown, ChevronUp, EyeOff, X,
  Snowflake, AlertTriangle, ThumbsUp
} from 'lucide-react';

const BRAND = '#0041af';

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const DAY_FULL  = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS    = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const getDateInfo = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return {
    short:   offset === 0 ? 'Oggi' : DAY_SHORT[d.getDay()],
    full:    DAY_FULL[d.getDay()],
    dateStr: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
    num:     d.getDate(),
  };
};

/* ── Animation variants ── */
const fadeDown = {
  hidden: { opacity: 0, y: -12 },
  show:   { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.055, delayChildren: 0.15 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

const sheetVariant = {
  hidden: { y: 80, opacity: 0 },
  show:   { y: 0,  opacity: 1, transition: { type: 'spring', stiffness: 220, damping: 28, delay: 0.25 } },
};

const contentSwap = {
  initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.18 } },
};

const slotVariant = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/* ── Slot verdict ── */
const getSlotVerdict = (s, dayData, ct) => {
  const rain = s.rain ?? 0;
  const temp = s.temp ?? 20;
  const hum  = s.humidity ?? 50;
  const wind = dayData?.wind ?? 0;

  if (rain > 60)
    return { label: 'Pioggia', color: '#dc2626', bg: '#fef2f2', icon: <CloudRain size={10} /> };
  if (temp > 33)
    return { label: 'Troppo caldo', color: '#dc2626', bg: '#fef2f2', icon: <Thermometer size={10} /> };
  if (wind > 35 && ct === 'outdoor')
    return { label: 'Vento forte', color: '#0d9488', bg: '#f0fdfa', icon: <Wind size={10} /> };
  if (temp < 8)
    return { label: 'Troppo freddo', color: '#6366f1', bg: '#eef2ff', icon: <Snowflake size={10} /> };
  if (rain > 30)
    return { label: 'Potrebbe piovere', color: '#e87400', bg: '#fff7ed', icon: <CloudRain size={10} /> };
  if (hum > 85)
    return { label: 'Umidità alta', color: '#e87400', bg: '#fff7ed', icon: <Droplets size={10} /> };
  if (temp < 12)
    return { label: 'Freddo', color: '#6366f1', bg: '#eef2ff', icon: <Snowflake size={10} /> };
  if (temp > 28)
    return { label: 'Abbastanza caldo', color: '#e87400', bg: '#fff7ed', icon: <Thermometer size={10} /> };
  if (temp >= 16 && temp <= 26 && rain < 15 && hum < 75)
    return { label: 'Ottimo', color: '#16a34a', bg: '#f0fdf4', icon: <ThumbsUp size={10} /> };
  return { label: 'OK', color: BRAND, bg: '#eff6ff', icon: <CheckCircle2 size={10} /> };
};

const App = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [courtType, setCourtType] = useState('outdoor');
  const [location, setLocation] = useState('Roma');
  const [tempLocation, setTempLocation] = useState('');
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const slotDetails = [
    { range: '08:00 - 12:00' },
    { range: '13:00 - 18:00' },
    { range: '19:00 - 23:00' },
  ];

  const mockFallback = Array.from({ length: 14 }).map((_, i) => {
    const di = getDateInfo(i);
    const rainy = i === 1;
    const windy = i === 3;
    const hot   = i >= 7;
    return {
      day:      di.short,
      full:     di.full,
      date:     di.dateStr,
      tempMin:  hot ? 24 : 9,
      tempMax:  hot ? 34 : (rainy ? 11 : 17),
      condition: rainy ? 'rain' : (windy ? 'windy' : 'sunny'),
      rainProb:  rainy ? 90 : (windy ? 20 : 5),
      wind:      windy ? 40 : 12,
      humidity:  rainy ? 92 : 58,
      slots: [
        { time: 'Mattina',    temp: hot ? 26 : 10, rain: rainy ? 85 : 5,  condition: rainy ? 'rain' : 'sunny', humidity: rainy ? 88 : 65 },
        { time: 'Pomeriggio', temp: hot ? 34 : 17, rain: rainy ? 80 : 5,  condition: rainy ? 'rain' : 'sunny', humidity: rainy ? 80 : 52 },
        { time: 'Sera',       temp: hot ? 28 : 12, rain: rainy ? 75 : 10, condition: rainy ? 'rain' : 'sunny', humidity: rainy ? 90 : 82 },
      ],
    };
  });

  // WMO weather code → condition
  const wmoToCondition = (code) => {
    if (code == null) return 'sunny';
    if ([51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(code)) return 'rain';
    if ([71,73,75,77,85,86].includes(code)) return 'rain';
    if (code === 3) return 'cloudy';
    return 'sunny';
  };

  // Average values over an array of hourly indices
  const avg = (arr, indices) => {
    const vals = indices.map(i => arr[i]).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  const max = (arr, indices) => Math.round(Math.max(...indices.map(i => arr[i] ?? 0)));
  const dominantCode = (arr, indices) => {
    const vals = indices.map(i => arr[i] ?? 0);
    return vals.sort((a, b) => b - a)[0];
  };

  const fetchWeather = async () => {
    try {
      setLoading(true);
      // 1. Geocoding
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=it&format=json`
      );
      const geoData = await geoRes.json();
      const place = geoData.results?.[0];
      if (!place) throw new Error('Città non trovata');
      const { latitude, longitude } = place;

      // 2. Forecast (hourly + daily, 14 days)
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', latitude);
      url.searchParams.set('longitude', longitude);
      url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,windspeed_10m,relativehumidity_2m,weathercode');
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode');
      url.searchParams.set('forecast_days', '14');
      url.searchParams.set('timezone', 'auto');
      url.searchParams.set('wind_speed_unit', 'kmh');

      const wxRes  = await fetch(url);
      const wx     = await wxRes.json();
      const hourly = wx.hourly;
      const daily  = wx.daily;

      const data = daily.time.map((dateStr, di) => {
        const info   = getDateInfo(di);
        // hourly indices for this day
        const base   = di * 24;
        const morn   = [8,9,10,11].map(h => base + h);   // 08-11
        const aftern = [13,14,15,16,17].map(h => base + h); // 13-17
        const eve    = [19,20,21,22].map(h => base + h);  // 19-22

        const slotData = (indices) => ({
          temp:      avg(hourly.temperature_2m, indices),
          rain:      max(hourly.precipitation_probability, indices),
          humidity:  avg(hourly.relativehumidity_2m, indices),
          condition: wmoToCondition(dominantCode(hourly.weathercode, indices)),
        });

        return {
          day:       info.short,
          full:      info.full,
          date:      info.dateStr,
          tempMax:   Math.round(daily.temperature_2m_max[di]),
          tempMin:   Math.round(daily.temperature_2m_min[di]),
          rainProb:  daily.precipitation_probability_max[di] ?? 0,
          wind:      Math.round(daily.windspeed_10m_max[di]),
          humidity:  avg(hourly.relativehumidity_2m, [base+12]),
          condition: wmoToCondition(daily.weathercode[di]),
          slots: [
            { time: 'Mattina',    ...slotData(morn)   },
            { time: 'Pomeriggio', ...slotData(aftern) },
            { time: 'Sera',       ...slotData(eve)    },
          ],
        };
      });

      processData(data, true);
    } catch {
      processData(mockFallback, false);
    }
  };

  const processData = (data, liveStatus) => {
    setWeatherData(data.map(d => ({ ...d, score: calculatePadelScore(d) })));
    setIsLive(liveStatus);
    setLoading(false);
  };

  const calculatePadelScore = (d) => {
    let s = 10;
    if (d.rainProb > 40 && courtType === 'outdoor') s -= 8;
    if (d.wind > 25    && courtType === 'outdoor') s -= 4;
    if (d.tempMax > 32) s -= 3;
    return Math.max(0, s);
  };

  const scoreDotColor = (score) => {
    if (score >= 8) return '#00d492';
    if (score >= 5) return '#ffb900';
    return '#ff6467';
  };

  const conditionIcon = (condition, size = 15) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('rain') || c.includes('piogg')) return <CloudRain className="text-blue-300" size={size} />;
    if (c.includes('wind') || c.includes('vent')) return <Wind className="text-teal-300" size={size} />;
    return <Sun className="text-amber-300" size={size} />;
  };

  useEffect(() => { fetchWeather(); }, [courtType, location]);

  const day  = weatherData?.[selectedDay];
  const slot = day?.slots?.[selectedSlot];

  const fieldAnalysis = () => {
    if (!slot || !day) return null;
    const rain = slot.rain ?? day.rainProb ?? 0;
    const isOutdoor = courtType === 'outdoor';

    // Pioggia — controlla sia il dato fascia che il giorno
    if (isOutdoor && (rain > 60 || (day.rainProb ?? 0) > 60))
      return { label: 'Rischio pioggia', tip: `${rain}% di pioggia. Campo scivoloso o impraticabile.`, color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', iconBg: '#dc2626', iconBgBorder: 'rgba(252,165,165,0.4)', icon: <CloudRain size={18} color="#fff" /> };

    // Vento
    if (isOutdoor && (day.wind ?? 0) > 25)
      return { label: 'Vento forte', tip: `Fino a ${day.wind} km/h. Evita pallonetti, gioca colpi bassi.`, color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', iconBg: '#0d9488', iconBgBorder: 'rgba(153,246,228,0.4)', icon: <Wind size={18} color="#fff" /> };

    // Caldo
    if (slot.temp > 30)
      return { label: courtType === 'indoor' ? 'Afa indoor' : 'Caldo intenso', tip: `${slot.temp}°C. Idratati spesso e riduci i punti lunghi.`, color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', iconBg: '#dc2626', iconBgBorder: 'rgba(252,165,165,0.4)', icon: <Thermometer size={18} color="#fff" /> };

    // Freddo
    if (slot.temp < 8)
      return { label: 'Troppo freddo', tip: `Solo ${slot.temp}°C. Riscaldamento lungo, rischio infortuni.`, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', iconBg: '#6366f1', iconBgBorder: 'rgba(199,210,254,0.4)', icon: <Thermometer size={18} color="#fff" /> };

    // Pioggia moderata sulla fascia
    if (isOutdoor && rain > 30)
      return { label: 'Possibile pioggia', tip: `${rain}% di probabilità pioggia in questa fascia. Tieni d'occhio il cielo.`, color: '#e87400', bg: '#fff7ed', border: '#feb84d', iconBg: '#e87400', iconBgBorder: 'rgba(254,154,0,0.4)', icon: <CloudRain size={18} color="#fff" /> };

    // Sole in faccia pomeriggio
    if (isOutdoor && slot.condition?.toLowerCase().includes('sun') && selectedSlot === 1)
      return { label: 'Sole in faccia', tip: 'Sole basso tra le 16 e le 18. Porta gli occhiali!', color: '#e87400', bg: '#fff7ed', border: '#feb84d', iconBg: '#e87400', iconBgBorder: 'rgba(254,154,0,0.4)', icon: <EyeOff size={18} color="#fff" /> };

    // Umidità vetri
    if ((slot.humidity ?? 0) > 85)
      return { label: 'Vetri bagnati', tip: 'Umidità altissima. La palla scivola sulle pareti.', color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', iconBg: '#dc2626', iconBgBorder: 'rgba(252,165,165,0.4)', icon: <Droplets size={18} color="#fff" /> };
    if ((slot.humidity ?? 0) > 70)
      return { label: 'Vetri umidi', tip: 'I vetri sudano. Rimbalzi meno reattivi.', color: '#e87400', bg: '#fff7ed', border: '#feb84d', iconBg: '#e87400', iconBgBorder: 'rgba(254,154,0,0.4)', icon: <Droplets size={18} color="#fff" /> };

    return { label: 'Clima ottimo', tip: 'Condizioni ideali. Divertitevi!', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', iconBg: '#16a34a', iconBgBorder: 'rgba(134,239,172,0.4)', icon: <CheckCircle2 size={18} color="#fff" /> };
  };

  const info = fieldAnalysis();

  /* ── Loading ── */
  if (loading) return (
    <motion.div className="min-h-screen flex flex-col items-center justify-center" style={{ background: BRAND }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Loader2 className="text-white mb-4" size={48} />
      </motion.div>
      <motion.p className="font-black text-white/60 uppercase tracking-widest text-[10px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Caricamento radar...
      </motion.p>
    </motion.div>
  );

  const fullDayName = day.full ?? day.day;

  return (
    <motion.div className="min-h-screen flex flex-col" style={{ background: BRAND }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>

      {/* ── Header ── */}
      <motion.header className="flex justify-between items-start px-6 pt-6 pb-2"
        variants={fadeDown} initial="hidden" animate="show"
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}>
        <div className="cursor-pointer" onClick={() => { setTempLocation(location); setIsLocModalOpen(true); }}>
          <h1 className="font-ibm text-[23.8px] leading-[24px] tracking-[-0.48px] italic text-white" style={{ fontWeight: 700 }}>
            Padel<span style={{ color: 'rgba(255,255,255,0.45)' }}>Weather</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1 text-[11px] uppercase font-ibm font-bold text-white/70">
              <MapPin size={10} className="text-white/50" /> {location}
            </span>
            <span className="text-[9px] font-bold px-[9px] py-[3px] rounded-full border border-white/15 text-white/30">
              {isLive ? 'LIVE' : 'DEMO'}
            </span>
          </div>
        </div>
        <motion.button onClick={() => fetchWeather()} className="p-[10px] rounded-[8px]"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          whileTap={{ scale: 0.88, rotate: -30 }} whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
          <RefreshCw size={17} className="text-white" />
        </motion.button>
      </motion.header>

      {/* ── Toggle ── */}
      <motion.div className="px-6 py-3" variants={fadeDown} initial="hidden" animate="show"
        transition={{ duration: 0.4, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}>
        <div className="flex p-1 rounded-[99px]" style={{ background: 'rgba(255,255,255,0.12)' }}>
          {['outdoor', 'indoor'].map((type) => (
            <motion.button key={type} onClick={() => setCourtType(type)}
              className={`flex-1 py-[10px] text-[12px] rounded-[999px] uppercase font-ibm font-bold ${courtType === type ? 'bg-white' : 'text-white'}`}
              style={courtType === type ? { color: BRAND } : {}}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
              {type === 'outdoor' ? "All'aperto" : 'Al chiuso'}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Day strip ── */}
      <div className="overflow-x-auto no-scrollbar w-full">
      <motion.div className="flex gap-[10px] px-6 pt-2 pb-7 items-stretch w-max"
        variants={staggerContainer} initial="hidden" animate="show">
        {weatherData.map((item, i) => {
          const isSelected = selectedDay === i;
          return (
            <motion.button key={i}
              onClick={() => { setSelectedDay(i); setSelectedSlot(1); }}
              className="flex-shrink-0 flex flex-col items-center gap-[5.8px] w-[70px] p-[14px] rounded-[6px]"
              style={isSelected ? { background: 'transparent', border: '2px solid #fff' } : { background: 'rgba(255,255,255,0.1)', border: '2px solid transparent' }}
              variants={cardVariant} whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }}>
              <span className="text-[9px] uppercase tracking-[0.9px] font-ibm font-bold text-white/50">{item.day}</span>
              <span className="text-[20px] leading-[20px] font-ibm text-white" style={{ fontWeight: 600 }}>{item.date.split(' ')[0]}</span>
              {conditionIcon(item.condition, 15)}
              <motion.div className="w-[6px] h-[6px] rounded-full" style={{ background: scoreDotColor(item.score) }}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 + i * 0.04 }} />
            </motion.button>
          );
        })}
      </motion.div>
      </div>

      {/* ── White bottom sheet ── */}
      <motion.div className="flex-1 bg-white rounded-t-[36px] px-6 pt-6 pb-10 flex flex-col gap-3"
        style={{ boxShadow: '0px -8px 40px 0px rgba(0,0,0,0.15)' }}
        variants={sheetVariant} initial="hidden" animate="show">

        {/* Day + temp */}
        <AnimatePresence mode="wait">
          <motion.div key={`header-${selectedDay}`} className="flex items-start justify-between" {...contentSwap}>
            <div className="flex flex-col gap-1">
              <h2 className="text-[36px] leading-[42px] tracking-[-1.8px] font-ibm text-[#222f44]" style={{ fontWeight: 600 }}>{fullDayName}</h2>
              <p className="font-ibm text-[18px] leading-[19.25px] text-[#364458]" style={{ fontWeight: 500 }}>{day.date}</p>
            </div>
            <div className="mt-1 pl-4 pr-3 py-[10px] rounded-[8px] font-ibm text-[24px] leading-[32px] text-white" style={{ fontWeight: 500, background: BRAND }}>
              {day.tempMax}°
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Fascia analizzata */}
        <AnimatePresence mode="wait">
          <motion.div key={`fascia-${selectedSlot}`} className="flex items-center gap-2" {...contentSwap}>
            <span className="font-ibm text-[14px] text-[#364458]" style={{ fontWeight: 500 }}>Fascia analizzata:</span>
            <span className="font-ibm text-[9px] text-white uppercase px-[10px] py-[2px] rounded-full" style={{ fontWeight: 600, background: BRAND }}>{slot.time}</span>
          </motion.div>
        </AnimatePresence>

        {/* Field analysis card */}
        <AnimatePresence mode="wait">
          <motion.div key={`card-${selectedDay}-${selectedSlot}-${courtType}`}
            className="p-5 rounded-[8px] flex flex-col gap-3"
            style={{ background: info.bg, border: `1px solid ${info.border}` }} {...contentSwap}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div className="p-[6.7px] rounded-[3.4px]"
                  style={{ background: info.iconBg, border: `0.842px solid ${info.iconBgBorder}` }}
                  initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.1 }}>
                  {info.icon}
                </motion.div>
                <span className="font-ibm text-[21px] leading-[22.5px] tracking-[-0.63px]" style={{ fontWeight: 600, color: info.color }}>{info.label}</span>
              </div>
              <div className="flex flex-col items-end w-[48px]">
                <span className="font-ibm text-[9px] uppercase text-[#b99090]" style={{ fontWeight: 700 }}>Vento</span>
                <span className="font-ibm text-[12px] leading-[16px] text-[#6c4545]" style={{ fontWeight: 700 }}>{day.wind} km/h</span>
              </div>
            </div>
            <p className="font-ibm text-[14px] leading-[19.25px] text-[#583131]" style={{ fontWeight: 500 }}>{info.tip}</p>
          </motion.div>
        </AnimatePresence>

        {/* Accordion slot detail */}
        <div className="border-t border-slate-100 pt-[13px]">
          <motion.button onClick={() => setIsAccordionOpen(o => !o)}
            className="w-full flex justify-between items-center pb-3" whileTap={{ scale: 0.98 }}>
            <span className="font-ibm text-[14px] text-[#364458]" style={{ fontWeight: 500 }}>Dettaglio orario</span>
            <motion.div animate={{ rotate: isAccordionOpen ? 0 : 180 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
              <ChevronUp size={15} className="text-slate-400" />
            </motion.div>
          </motion.button>

          <AnimatePresence initial={false}>
            {isAccordionOpen && (
              <motion.div key="slots"
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ overflow: 'hidden' }}>
                <motion.div className="flex flex-col gap-2 pb-1"
                  variants={{ show: { transition: { staggerChildren: 0.07 } } }} initial="hidden" animate="show">
                  {day.slots.map((s, i) => {
                    const isActive = selectedSlot === i;
                    const verdict = getSlotVerdict(s, day, courtType);
                    return (
                      <motion.button key={i} onClick={() => setSelectedSlot(i)}
                        className="w-full flex items-center justify-between"
                        variants={slotVariant} whileTap={{ scale: 0.98 }}
                        style={isActive
                          ? { background: 'rgba(37,37,255,0.03)', border: `1px solid ${BRAND}`, borderRadius: '8px', padding: '14px 16px', opacity: 1 }
                          : { background: '#f8fafc', border: '2px solid transparent', borderRadius: '8px', padding: '14px 16px', opacity: 0.65 }}>

                        {/* Left: name + time */}
                        <div className="flex flex-col items-start min-w-[80px]">
                          <span className="font-ibm text-[16px] text-[#364458]" style={{ fontWeight: isActive ? 700 : 500 }}>
                            {s.time}
                          </span>
                          <span className="font-ibm text-[10px] text-[#90a1b9] leading-[14px]" style={{ fontWeight: 600 }}>
                            {slotDetails[i].range}
                          </span>
                        </div>

                        {/* Center: verdict badge */}
                        <motion.div
                          className="flex items-center gap-1 px-[8px] py-[4px] rounded-[6px]"
                          style={{ background: verdict.bg }}
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.05 }}>
                          <span style={{ color: verdict.color }}>{verdict.icon}</span>
                          <span className="font-ibm text-[11px] leading-none" style={{ fontWeight: 700, color: verdict.color }}>
                            {verdict.label}
                          </span>
                        </motion.div>

                        {/* Right: temp + rain */}
                        <div className="flex flex-col items-end min-w-[36px]">
                          <span className="font-ibm text-[14px] leading-[18px]"
                                style={{ fontWeight: 700, color: s.temp > 30 ? '#fb2c36' : '#1d293d' }}>
                            {s.temp}°
                          </span>
                          <div className="flex items-center gap-0.5">
                            <CloudRain size={9} style={{ color: s.rain > 30 ? '#3b82f6' : '#cbd5e1' }} />
                            <span className="font-ibm text-[10px] text-[#90a1b9]" style={{ fontWeight: 600 }}>{s.rain}%</span>
                          </div>
                        </div>

                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Share CTA */}
        <motion.button
          onClick={() => {
            const text = `🎾 Padel Weather (${location})\n📅 ${fullDayName} ${day.date}\n⏰ ${slot.time}\n${info.label}: ${info.tip}`;
            navigator.clipboard.writeText(text);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
          }}
          className="w-full py-[17px] rounded-[8px] font-ibm text-[17px] text-white"
          style={{ fontWeight: 500, background: copyFeedback ? '#16a34a' : BRAND }}
          whileHover={{ scale: 1.015, boxShadow: `0 8px 28px ${BRAND}55` }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}
          layout>
          <AnimatePresence mode="wait">
            <motion.span key={copyFeedback ? 'copied' : 'share'}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              {copyFeedback ? 'Copiato!' : 'Condividi meteo'}
            </motion.span>
          </AnimatePresence>
        </motion.button>

      </motion.div>

      {/* ── Location modal ── */}
      <AnimatePresence>
        {isLocModalOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end" style={{ backdropFilter: 'blur(8px)' }}
            initial={{ background: 'rgba(0,0,0,0)' }} animate={{ background: 'rgba(0,0,0,0.6)' }} exit={{ background: 'rgba(0,0,0,0)' }}
            transition={{ duration: 0.25 }} onClick={() => setIsLocModalOpen(false)}>
            <motion.div className="w-full bg-white rounded-t-[32px] px-6 pt-6 pb-12"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black tracking-tight">Zona di gioco</h3>
                <button onClick={() => setIsLocModalOpen(false)} className="p-2 rounded-xl bg-slate-100"><X size={18} /></button>
              </div>
              <input type="text" value={tempLocation} onChange={e => setTempLocation(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && tempLocation) { setLocation(tempLocation); setIsLocModalOpen(false); } }}
                placeholder="Es. Milano, Roma, 20100…"
                className="w-full bg-slate-100 rounded-2xl py-4 px-5 font-bold text-lg mb-4 outline-none placeholder:text-slate-400"
                autoFocus />
              <motion.button onClick={() => { if (tempLocation) { setLocation(tempLocation); setIsLocModalOpen(false); } }}
                className="w-full py-4 rounded-[8px] font-ibm text-white text-sm uppercase tracking-wider"
                style={{ fontWeight: 700, background: BRAND }} whileTap={{ scale: 0.97 }}>
                Aggiorna radar →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default App;
