window.DuboxdApp = (function () {
  const STAR_PATH = "M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.1l-6 3.4 1.3-6.7-5-4.6 6.8-.8L12 2.2z";

  function renderStarsHtml(rating, liked) {
    const count = Math.round(Number(rating) || 0);
    let html = '<span class="star-row">';
    for (let i = 1; i <= 5; i++) {
      const cls = i <= count ? "star-svg" : "star-svg empty";
      html += `<svg class="${cls}" viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg>`;
    }
    if (liked) {
      html += '<span class="like-mark" title="Marked Favorite"></span>';
    }
    html += "</span>";
    return html;
  }

  function showToast(message) {
    let el = document.getElementById("duboxd-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "duboxd-toast";
      el.className = "toast-notice";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("visible");
    setTimeout(() => {
      el.classList.remove("visible");
    }, 2600);
  }

  function renderPosterCard(movie) {
    const year = (movie.release_date || "").slice(0, 4);
    const posterUrl = window.DuboxdTMDB.getPosterUrl(movie);
    const fallbackUrl = window.DuboxdTMDB.buildCriterionSvgDataUri(movie.title, year, movie.director);
    const duScore = movie.du_rating ? Number(movie.du_rating).toFixed(1) : "4.5";

    return `
      <a href="film.html?id=${movie.id}" class="poster-card" title="${movie.title} (${year})">
        <img src="${posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackUrl}';">
        <div class="poster-overlay">
          <div class="poster-overlay-title">${movie.title}</div>
          <div class="poster-overlay-meta">
            <span>${year}</span>
            <span>AVG ${duScore}</span>
          </div>
        </div>
      </a>
    `;
  }

  function renderReviewCard(log, showPoster) {
    const posterMovie = {
      id: log.movie_id,
      title: log.movie_title,
      release_date: log.movie_year,
      poster_path: log.poster_path
    };
    const posterUrl = window.DuboxdTMDB.getPosterUrl(posterMovie);
    const fallbackUrl = window.DuboxdTMDB.buildCriterionSvgDataUri(log.movie_title, log.movie_year, "");
    const deptBadge = log.user_dept ? `<span class="dept-badge">${log.user_dept}</span>` : "";
    const hallBadge = log.user_hall ? `<span class="dept-badge">${log.user_hall}</span>` : "";

    if (!showPoster) {
      return `
        <div class="review-card review-card-NoPoster">
          <div>
            <div class="review-author-line">
              <span class="author-name">${log.user_name}</span>
              ${deptBadge}
              ${hallBadge}
              ${renderStarsHtml(log.rating, log.liked)}
              <span class="review-date ms-auto">${log.watched_date}</span>
            </div>
            <p class="review-body">${log.review || "Logged without written dispatch."}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="review-card">
        <a href="film.html?id=${log.movie_id}" class="review-mini-poster">
          <img src="${posterUrl}" alt="${log.movie_title}" onerror="this.onerror=null;this.src='${fallbackUrl}';">
        </a>
        <div>
          <div class="review-header">
            <div>
              <a href="film.html?id=${log.movie_id}" class="review-film-title">${log.movie_title}</a>
              <span class="review-film-year">${log.movie_year}</span>
            </div>
            <span class="review-date">${log.watched_date}</span>
          </div>
          <div class="review-author-line">
            <span class="author-name">${log.user_name}</span>
            ${deptBadge}
            ${hallBadge}
            ${renderStarsHtml(log.rating, log.liked)}
          </div>
          <p class="review-body">${log.review || "Logged to diary."}</p>
        </div>
      </div>
    `;
  }

  function renderHeader(activePage) {
    const mount = document.getElementById("site-header-mount");
    if (!mount) return;
    const user = window.DuboxdStore.getCurrentUser();
    const userLabel = user ? user.name.split(" ")[0] : "Sign In";
    const userHref = user ? "profile.html" : "login.html";

    mount.innerHTML = `
      <header class="site-header">
        <div class="site-container header-inner">
          <a href="index.html" class="brand-mark">
            <span class="brand-word">DU<span>BOXD</span></span>
            <span class="brand-sub">Campus Film Ledger</span>
          </a>
          <ul class="nav-links">
            <li><a href="index.html" class="${activePage === "home" ? "active" : ""}">Index</a></li>
            <li><a href="films.html" class="${activePage === "films" ? "active" : ""}">Films</a></li>
            <li><a href="profile.html" class="${activePage === "profile" ? "active" : ""}">Dossier</a></li>
          </ul>
          <div class="header-actions">
            <button type="button" class="btn-crimson" id="btn-open-log-modal">+ Log Film</button>
            <a href="${userHref}" class="btn-ghost ${activePage === "login" ? "active" : ""}">${userLabel}</a>
          </div>
        </div>
      </header>
    `;

    const logBtn = document.getElementById("btn-open-log-modal");
    if (logBtn) {
      logBtn.addEventListener("click", () => openLogModal());
    }
  }

  function renderFooter() {
    const mount = document.getElementById("site-footer-mount");
    if (!mount) return;

    mount.innerHTML = `
      <footer class="site-footer">
        <div class="site-container footer-inner">
          <div>DUBOXD — CAMPUS FILM ARCHIVE</div>
        </div>
      </footer>
    `;
  }

  function injectLogModal() {
    if (document.getElementById("globalLogModal")) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="modal fade" id="globalLogModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-content-dark">
            <div class="modal-header-dark">
              <h5 class="modal-title-caps">Record Film Entry</h5>
              <button type="button" class="btn-close-dark" data-bs-dismiss="modal">Close</button>
            </div>
            <div class="modal-body p-3">
              <form id="global-log-form">
                <input type="hidden" id="log-movie-id" value="5967">
                <input type="hidden" id="log-poster-path" value="">
                <div class="mb-3">
                  <label class="form-label-caps">Select or Search Film</label>
                  <input type="text" id="log-film-search" class="form-control-dark" placeholder="Type film title (e.g. Pather Panchali, In the Mood for Love)..." autocomplete="off" required>
                  <div id="log-search-results" class="search-results-dropdown d-none"></div>
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label-caps">Watched Date</label>
                    <input type="date" id="log-watched-date" class="form-control-dark" required>
                  </div>
                  <div class="col-6">
                    <label class="form-label-caps">Release Year</label>
                    <input type="text" id="log-movie-year" class="form-control-dark" value="1955" required>
                  </div>
                </div>
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div>
                    <label class="form-label-caps">Rating</label>
                    <div class="star-picker" id="modal-star-picker">
                      <button type="button" class="star-picker-btn active" data-val="1"><svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg></button>
                      <button type="button" class="star-picker-btn active" data-val="2"><svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg></button>
                      <button type="button" class="star-picker-btn active" data-val="3"><svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg></button>
                      <button type="button" class="star-picker-btn active" data-val="4"><svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg></button>
                      <button type="button" class="star-picker-btn" data-val="5"><svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg></button>
                    </div>
                  </div>
                  <div class="d-flex gap-2 pt-3">
                    <button type="button" class="btn-ghost active" id="btn-toggle-like">Favorite</button>
                    <button type="button" class="btn-ghost" id="btn-toggle-rewatch">Rewatch</button>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label-caps">Critical Dispatch / Notes</label>
                  <textarea id="log-review-text" class="form-control-dark" rows="3" placeholder="Write your review or notes..."></textarea>
                </div>
                <div class="d-flex justify-content-end gap-2">
                  <button type="button" class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
                  <button type="submit" class="btn-crimson">Save to Ledger</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    const dateInput = document.getElementById("log-watched-date");
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }

    let selectedRating = 4;
    let isLiked = true;
    let isRewatch = false;

    const starBtns = document.querySelectorAll("#modal-star-picker .star-picker-btn");
    starBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedRating = Number(btn.getAttribute("data-val"));
        starBtns.forEach((b) => {
          b.classList.toggle("active", Number(b.getAttribute("data-val")) <= selectedRating);
        });
      });
    });

    const likeBtn = document.getElementById("btn-toggle-like");
    likeBtn.addEventListener("click", () => {
      isLiked = !isLiked;
      likeBtn.classList.toggle("active", isLiked);
    });

    const rewatchBtn = document.getElementById("btn-toggle-rewatch");
    rewatchBtn.addEventListener("click", () => {
      isRewatch = !isRewatch;
      rewatchBtn.classList.toggle("active", isRewatch);
    });

    const searchInput = document.getElementById("log-film-search");
    const resultsBox = document.getElementById("log-search-results");

    searchInput.addEventListener("input", async () => {
      const q = searchInput.value.trim();
      if (q.length < 1) {
        resultsBox.classList.add("d-none");
        return;
      }
      const matches = await window.DuboxdTMDB.searchMovies(q, "all", "popular");
      if (!matches.length) {
        resultsBox.classList.add("d-none");
        return;
      }
      resultsBox.innerHTML = matches
        .slice(0, 6)
        .map((m) => {
          const yr = (m.release_date || "").slice(0, 4);
          return `<div class="search-result-item" data-id="${m.id}" data-title="${m.title.replace(/"/g, "&quot;")}" data-year="${yr}" data-poster="${m.poster_path || ""}">
            <span>${m.title}</span>
            <span class="text-secondary">${yr}</span>
          </div>`;
        })
        .join("");
      resultsBox.classList.remove("d-none");

      resultsBox.querySelectorAll(".search-result-item").forEach((item) => {
        item.addEventListener("click", () => {
          document.getElementById("log-movie-id").value = item.getAttribute("data-id");
          document.getElementById("log-film-search").value = item.getAttribute("data-title");
          document.getElementById("log-movie-year").value = item.getAttribute("data-year");
          document.getElementById("log-poster-path").value = item.getAttribute("data-poster");
          resultsBox.classList.add("d-none");
        });
      });
    });

    const form = document.getElementById("global-log-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const titleVal = document.getElementById("log-film-search").value.trim();
      const yearVal = document.getElementById("log-movie-year").value.trim();
      let movieIdVal = Number(document.getElementById("log-movie-id").value);
      const posterVal = document.getElementById("log-poster-path").value;

      if (!movieIdVal) {
        movieIdVal = Date.now();
      }

      try {
        await window.DuboxdStore.addLog({
          movie_id: movieIdVal,
          movie_title: titleVal,
          movie_year: yearVal,
          poster_path: posterVal,
          rating: selectedRating,
          liked: isLiked,
          rewatch: isRewatch,
          watched_date: document.getElementById("log-watched-date").value,
          review: document.getElementById("log-review-text").value
        });

        const modalEl = document.getElementById("globalLogModal");
        const bsModal = window.bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();

        document.getElementById("log-review-text").value = "";
        showToast("Entry recorded in Film Ledger");
        window.dispatchEvent(new CustomEvent("duboxd:log-added"));
      } catch (err) {
        showToast(err.message || "Could not save entry");
      }
    });
  }

  function openLogModal(prefillMovie) {
    injectLogModal();
    if (prefillMovie) {
      document.getElementById("log-movie-id").value = prefillMovie.id;
      document.getElementById("log-film-search").value = prefillMovie.title;
      document.getElementById("log-movie-year").value = (prefillMovie.release_date || "2024").slice(0, 4);
      document.getElementById("log-poster-path").value = prefillMovie.poster_path || "";
    }
    const modalEl = document.getElementById("globalLogModal");
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
  }

  async function initHomePage() {
    const trendingGrid = document.getElementById("home-trending-grid");
    const reviewsList = document.getElementById("home-reviews-list");

    const movies = await window.DuboxdTMDB.fetchTrending();
    if (trendingGrid) {
      trendingGrid.innerHTML = movies.slice(0, 6).map(renderPosterCard).join("");
    }

    async function loadHomeReviews() {
      const logs = await window.DuboxdStore.getLogs();
      if (reviewsList) {
        if (!logs.length) {
          reviewsList.innerHTML = `<div class="review-card review-card-NoPoster"><p class="review-body text-secondary">No member dispatches logged yet.</p></div>`;
        } else {
          reviewsList.innerHTML = logs.slice(0, 5).map((l) => renderReviewCard(l, true)).join("");
        }
      }
    }

    await loadHomeReviews();
    window.addEventListener("duboxd:log-added", loadHomeReviews);
  }

  async function initFilmsPage() {
    const grid = document.getElementById("films-catalog-grid");
    const searchInput = document.getElementById("catalog-search-input");
    const genreSelect = document.getElementById("catalog-genre-select");
    const sortSelect = document.getElementById("catalog-sort-select");
    const countLabel = document.getElementById("catalog-count-label");

    async function refreshCatalog() {
      const q = searchInput ? searchInput.value : "";
      const genre = genreSelect ? genreSelect.value : "all";
      const sort = sortSelect ? sortSelect.value : "popular";
      const list = await window.DuboxdTMDB.searchMovies(q, genre, sort);
      if (countLabel) {
        countLabel.textContent = `${list.length} TITLES IN INDEX`;
      }
      if (grid) {
        grid.innerHTML = list.map(renderPosterCard).join("");
      }
    }

    if (searchInput) searchInput.addEventListener("input", refreshCatalog);
    if (genreSelect) genreSelect.addEventListener("change", refreshCatalog);
    if (sortSelect) sortSelect.addEventListener("change", refreshCatalog);

    await refreshCatalog();
  }

  async function initFilmDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get("id") || 5967;
    const movie = await window.DuboxdTMDB.getMovieDetails(movieId);
    const year = (movie.release_date || "").slice(0, 4);
    const posterUrl = window.DuboxdTMDB.getPosterUrl(movie);
    const fallbackUrl = window.DuboxdTMDB.buildCriterionSvgDataUri(movie.title, year, movie.director);
    const backdropUrl = window.DuboxdTMDB.getBackdropUrl(movie);

    document.title = `${movie.title} (${year}) — DUBOXD`;

    const backdropImg = document.getElementById("detail-backdrop-img");
    if (backdropImg) {
      if (backdropUrl) {
        backdropImg.src = backdropUrl;
      } else {
        backdropImg.src = posterUrl;
      }
    }

    const posterMount = document.getElementById("detail-poster-mount");
    if (posterMount) {
      posterMount.innerHTML = `<img src="${posterUrl}" alt="${movie.title}" onerror="this.onerror=null;this.src='${fallbackUrl}';">`;
    }

    document.getElementById("detail-title").textContent = movie.title;
    document.getElementById("detail-meta").innerHTML = `
      <span><strong>${year}</strong></span>
      <span>Directed by <strong>${movie.director}</strong></span>
      <span>${movie.runtime} mins</span>
      <span>${movie.country}</span>
    `;
    document.getElementById("detail-tagline").textContent = movie.tagline || "ARCHIVE SELECTION";
    document.getElementById("detail-synopsis").textContent = movie.overview;

    const genresMount = document.getElementById("detail-genres");
    if (genresMount) {
      genresMount.innerHTML = (movie.genres || [])
        .map((g) => `<span class="genre-tag">${g}</span>`)
        .join("");
    }

    const castMount = document.getElementById("detail-cast");
    if (castMount) {
      castMount.innerHTML = (movie.cast || [])
        .map((c) => `<span class="genre-tag">${c}</span>`)
        .join("");
    }

    const watchBtn = document.getElementById("btn-detail-watchlist");
    const favBtn = document.getElementById("btn-detail-favorite");
    const logBtn = document.getElementById("btn-detail-log");

    function syncActionButtons() {
      const inWatch = window.DuboxdStore.isInWatchlist(movie.id);
      const inFav = window.DuboxdStore.isFavorite(movie.id);
      if (watchBtn) {
        watchBtn.textContent = inWatch ? "In Watchlist" : "+ Watchlist";
        watchBtn.classList.toggle("active", inWatch);
      }
      if (favBtn) {
        favBtn.textContent = inFav ? "In Top 4 Favorites" : "Set as Top 4 Favorite";
        favBtn.classList.toggle("active", inFav);
      }
    }

    syncActionButtons();

    if (watchBtn) {
      watchBtn.addEventListener("click", async () => {
        const added = await window.DuboxdStore.toggleWatchlist(movie.id);
        syncActionButtons();
        showToast(added ? "Added to Watchlist" : "Removed from Watchlist");
      });
    }

    if (favBtn) {
      favBtn.addEventListener("click", async () => {
        const added = await window.DuboxdStore.toggleFavorite(movie.id);
        syncActionButtons();
        showToast(added ? "Pinned to Profile Top 4" : "Removed from Profile Top 4");
      });
    }

    if (logBtn) {
      logBtn.addEventListener("click", () => openLogModal(movie));
    }

    async function renderFilmReviews() {
      const logs = await window.DuboxdStore.getLogs(movie.id);
      const reviewsMount = document.getElementById("detail-reviews-mount");
      const scoreEl = document.getElementById("detail-du-score");
      const countEl = document.getElementById("detail-du-count");

      if (logs.length) {
        const avg = logs.reduce((acc, r) => acc + Number(r.rating || 4), 0) / logs.length;
        if (scoreEl) scoreEl.textContent = avg.toFixed(1);
        if (countEl) countEl.textContent = `${logs.length} Reviews`;
      } else {
        if (scoreEl) scoreEl.textContent = Number(movie.du_rating || 4.5).toFixed(1);
        if (countEl) countEl.textContent = `${movie.du_logs || 40} Logs`;
      }

      if (reviewsMount) {
        if (!logs.length) {
          reviewsMount.innerHTML = `<div class="review-card review-card-NoPoster"><p class="review-body text-secondary">No written dispatches for this title yet. Use "+ Log or Review" to record the first entry.</p></div>`;
        } else {
          reviewsMount.innerHTML = logs.map((l) => renderReviewCard(l, false)).join("");
        }
      }
    }

    await renderFilmReviews();
    window.addEventListener("duboxd:log-added", renderFilmReviews);
  }

  async function initProfilePage() {
    const user = window.DuboxdStore.getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    document.getElementById("profile-name").textContent = user.name;
    document.getElementById("profile-monogram").textContent = user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
    const badgeParts = [user.dept, user.hall, user.batch].filter(Boolean);
    document.getElementById("profile-badges").innerHTML = badgeParts
      .map((b) => `<span class="dept-badge">${b}</span>`)
      .join("");
    document.getElementById("profile-bio").textContent = user.bio || "";

    const signOutBtn = document.getElementById("btn-sign-out");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        await window.DuboxdStore.signOut();
        window.location.href = "login.html";
      });
    }

    async function renderProfileSections() {
      const favIds = window.DuboxdStore.getFavoriteIds();
      const favMovies = await Promise.all(favIds.map((id) => window.DuboxdTMDB.getMovieDetails(id)));
      const favGrid = document.getElementById("profile-favorites-grid");
      if (favGrid) {
        favGrid.innerHTML = favMovies.length
          ? favMovies.map(renderPosterCard).join("")
          : `<div class="text-secondary">No favorites selected yet.</div>`;
      }

      const watchIds = window.DuboxdStore.getWatchlistIds();
      const watchMovies = await Promise.all(watchIds.map((id) => window.DuboxdTMDB.getMovieDetails(id)));
      const watchGrid = document.getElementById("profile-watchlist-grid");
      if (watchGrid) {
        watchGrid.innerHTML = watchMovies.length
          ? watchMovies.map(renderPosterCard).join("")
          : `<div class="text-secondary">Watchlist is empty.</div>`;
      }

      const allLogs = await window.DuboxdStore.getLogs();
      const logs = allLogs.filter((l) => !l.user_id || l.user_id === user.id);
      document.getElementById("stat-total-logs").textContent = logs.length;
      document.getElementById("stat-watchlist-count").textContent = watchIds.length;

      const diaryBody = document.getElementById("profile-diary-tbody");
      if (diaryBody) {
        if (!logs.length) {
          diaryBody.innerHTML = `<tr><td colspan="5" class="text-secondary">No diary entries recorded yet.</td></tr>`;
        } else {
          diaryBody.innerHTML = logs
            .map(
              (l) => `
            <tr>
              <td class="diary-date-box">${l.watched_date}</td>
              <td>
                <a href="film.html?id=${l.movie_id}" class="fw-bold">${l.movie_title}</a>
                <span class="review-film-year">${l.movie_year}</span>
              </td>
              <td>${renderStarsHtml(l.rating, l.liked)}</td>
              <td class="text-secondary">${l.rewatch ? "Rewatch" : "First Watch"}</td>
              <td class="text-secondary">${l.user_name}</td>
            </tr>
          `
            )
            .join("");
        }
      }
    }

    await renderProfileSections();
    window.addEventListener("duboxd:log-added", renderProfileSections);
  }

  function initLoginPage() {
    const loginForm = document.getElementById("form-signin");
    const registerForm = document.getElementById("form-signup");

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("signin-email").value.trim();
        const password = document.getElementById("signin-password").value;
        try {
          await window.DuboxdStore.signIn(email, password);
          window.location.href = "profile.html";
        } catch (err) {
          showToast(err.message || "Sign in failed");
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await window.DuboxdStore.signUp({
            name: document.getElementById("signup-name").value.trim(),
            email: document.getElementById("signup-email").value.trim(),
            password: document.getElementById("signup-password").value
          });
          window.location.href = "profile.html";
        } catch (err) {
          showToast(err.message || "Registration failed");
        }
      });
    }
  }

  function boot() {
    const page = document.body.getAttribute("data-page") || "home";
    renderHeader(page);
    renderFooter();
    injectLogModal();

    if (page === "home") initHomePage();
    if (page === "films") initFilmsPage();
    if (page === "film") initFilmDetailPage();
    if (page === "profile") initProfilePage();
    if (page === "login") initLoginPage();
  }

  document.addEventListener("DOMContentLoaded", boot);

  return {
    openLogModal,
    showToast
  };
})();
