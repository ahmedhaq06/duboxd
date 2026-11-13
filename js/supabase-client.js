window.DuboxdStore = (function () {
  const cfg = window.DUBOXD_CONFIG || {};
  let supabase = null;

  if (
    window.supabase &&
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.startsWith("http")
  ) {
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  const STORAGE_KEYS = {
    USER: "duboxd_active_user",
    LOGS: "duboxd_logs",
    WATCHLIST: "duboxd_watchlist",
    FAVORITES: "duboxd_favorites",
    SCREENINGS: "duboxd_screenings",
    RSVPS: "duboxd_rsvps"
  };

  function initSeedData() {
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(window.DUBOXD_SEED_LOGS || []));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCREENINGS)) {
      localStorage.setItem(STORAGE_KEYS.SCREENINGS, JSON.stringify(window.DUBOXD_SEED_SCREENINGS || []));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WATCHLIST)) {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([]));
    }
  }

  initSeedData();

  function isSupabaseConnected() {
    return Boolean(supabase);
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async function signIn(email, password) {
    if (!supabase) {
      throw new Error("Supabase is not configured yet.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const u = data.user;
    const meta = u.user_metadata || {};
    const profile = {
      id: u.id,
      email: u.email,
      name: meta.name || email.split("@")[0],
      dept: meta.dept || "DU Member",
      hall: meta.hall || "University of Dhaka",
      batch: meta.batch || "",
      bio: meta.bio || ""
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
    return profile;
  }

  async function signUp(payload) {
    if (!supabase) {
      throw new Error("Supabase is not configured yet.");
    }
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          name: payload.name,
          dept: payload.dept,
          hall: payload.hall,
          batch: payload.batch,
          bio: payload.bio || ""
        }
      }
    });
    if (error) throw error;
    const profile = {
      id: data.user ? data.user.id : "du-" + Date.now(),
      email: payload.email,
      name: payload.name,
      dept: payload.dept,
      hall: payload.hall,
      batch: payload.batch,
      bio: payload.bio || ""
    };
    if (data.user) {
      try {
        await supabase.from("profiles").upsert([
          {
            id: data.user.id,
            name: payload.name,
            dept: payload.dept,
            hall: payload.hall,
            batch: payload.batch,
            bio: payload.bio || ""
          }
        ]);
      } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
    return profile;
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  async function getLogs(movieId) {
    if (supabase) {
      try {
        let query = supabase.from("logs").select("*").order("watched_date", { ascending: false });
        if (movieId) {
          query = query.eq("movie_id", Number(movieId));
        }
        const { data, error } = await query;
        if (!error && data) return data;
      } catch (e) {}
    }

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || "[]");
    if (movieId) {
      return logs.filter((l) => Number(l.movie_id) === Number(movieId));
    }
    return logs;
  }

  async function addLog(entry) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      throw new Error("Please sign in to log a film.");
    }
    const newLog = {
      id: "log-" + Date.now(),
      movie_id: Number(entry.movie_id),
      movie_title: entry.movie_title,
      movie_year: String(entry.movie_year || "2024"),
      poster_path: entry.poster_path || "",
      user_id: user.id,
      user_name: user.name,
      user_dept: user.dept,
      user_hall: user.hall,
      rating: Number(entry.rating || 4),
      liked: Boolean(entry.liked),
      rewatch: Boolean(entry.rewatch),
      watched_date: entry.watched_date || new Date().toISOString().slice(0, 10),
      review: (entry.review || "").trim()
    };

    if (supabase) {
      const { error } = await supabase.from("logs").insert([newLog]);
      if (error) throw error;
    }

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || "[]");
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    return newLog;
  }

  function getWatchlistIds() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || "[]").map(Number);
  }

  function isInWatchlist(movieId) {
    return getWatchlistIds().includes(Number(movieId));
  }

  async function toggleWatchlist(movieId) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return false;
    }
    const numId = Number(movieId);
    const list = getWatchlistIds();
    const idx = list.indexOf(numId);
    let added = false;
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.unshift(numId);
      added = true;
    }
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    if (supabase) {
      try {
        await supabase.from("profiles").update({ watchlist: list }).eq("id", user.id);
      } catch (e) {}
    }
    return added;
  }

  function getFavoriteIds() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || "[]").map(Number);
  }

  function isFavorite(movieId) {
    return getFavoriteIds().includes(Number(movieId));
  }

  async function toggleFavorite(movieId) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return false;
    }
    const numId = Number(movieId);
    const list = getFavoriteIds();
    const idx = list.indexOf(numId);
    let added = false;
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      if (list.length >= 4) {
        list.pop();
      }
      list.unshift(numId);
      added = true;
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(list));
    if (supabase) {
      try {
        await supabase.from("profiles").update({ favorites: list }).eq("id", user.id);
      } catch (e) {}
    }
    return added;
  }

  async function getScreenings() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("screenings")
          .select("*")
          .order("screening_date", { ascending: true });
        if (!error && data && data.length) return data;
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCREENINGS) || "[]");
  }

  async function addScreening(item) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      throw new Error("Please sign in to publish a screening.");
    }
    const record = {
      id: "scr-" + Date.now(),
      movie_id: Number(item.movie_id || 5967),
      movie_title: item.movie_title,
      movie_year: item.movie_year || "2024",
      director: item.director || "DU Selection",
      poster_path: item.poster_path || "",
      club_name: item.club_name,
      venue: item.venue,
      screening_date: item.screening_date,
      screening_time: item.screening_time,
      format_tag: item.format_tag || "Digital Projection",
      entry_note: item.entry_note || "Open to DU Students",
      rsvp_count: 1,
      discussion_lead: item.discussion_lead || "Open floor discussion following credits"
    };

    if (supabase) {
      const { error } = await supabase.from("screenings").insert([record]);
      if (error) throw error;
    }

    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCREENINGS) || "[]");
    list.unshift(record);
    localStorage.setItem(STORAGE_KEYS.SCREENINGS, JSON.stringify(list));
    return record;
  }

  function hasRsvped(screeningId) {
    const rsvps = JSON.parse(localStorage.getItem(STORAGE_KEYS.RSVPS) || "[]");
    return rsvps.includes(screeningId);
  }

  async function toggleRsvp(screeningId) {
    const rsvps = JSON.parse(localStorage.getItem(STORAGE_KEYS.RSVPS) || "[]");
    const screenings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCREENINGS) || "[]");
    const idx = rsvps.indexOf(screeningId);
    let active = false;
    let updatedCount = 1;

    if (idx >= 0) {
      rsvps.splice(idx, 1);
      screenings.forEach((s) => {
        if (s.id === screeningId && s.rsvp_count > 0) {
          s.rsvp_count -= 1;
          updatedCount = s.rsvp_count;
        }
      });
    } else {
      rsvps.push(screeningId);
      active = true;
      screenings.forEach((s) => {
        if (s.id === screeningId) {
          s.rsvp_count = (s.rsvp_count || 0) + 1;
          updatedCount = s.rsvp_count;
        }
      });
    }

    localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(rsvps));
    localStorage.setItem(STORAGE_KEYS.SCREENINGS, JSON.stringify(screenings));

    if (supabase) {
      try {
        await supabase.from("screenings").update({ rsvp_count: updatedCount }).eq("id", screeningId);
      } catch (e) {}
    }
    return active;
  }

  return {
    isSupabaseConnected,
    getCurrentUser,
    signIn,
    signUp,
    signOut,
    getLogs,
    addLog,
    getWatchlistIds,
    isInWatchlist,
    toggleWatchlist,
    getFavoriteIds,
    isFavorite,
    toggleFavorite,
    getScreenings,
    addScreening,
    hasRsvped,
    toggleRsvp
  };
})();
