// place-picker.ts
import L from "leaflet";
// 안전 escape
const esc = (s) => s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
function qs(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`#${id} not found`);
    return el;
}
export function initBirthPlacePicker(opts) {
    const { buttonId, buttonInputId, modalId, closeMapId, mapCloseBtnId, searchBoxId, suggestionsId, mapId, } = opts.ids;
    const initialCenter = opts.initialCenter ?? { lat: 37.5665, lon: 126.9780 };
    // ===== Elements =====
    const placeInput = qs(buttonInputId); // 읽기 전용 input
    const placeBtn = qs(buttonId); // 열기 버튼
    const modal = qs(modalId);
    const mapCloseBtn = qs(mapCloseBtnId);
    const searchBox = qs(searchBoxId);
    const suggList = qs(suggestionsId);
    const closeMap = closeMapId ? qs(closeMapId) : null;
    let map = null;
    let marker = null;
    let debounceTimer = null; // 검색 디바운스
    // ===== Util: Space Guard =====
    const isSpaceKey = (e) => e.code === "Space" || e.key === " " || e.key === "Spacebar" || e.key === "Space";
    const onSpaceGuard = (e) => {
        if (!isSpaceKey(e))
            return;
        // 스페이스는 검색 인풋에서만 허용
        if (document.activeElement === searchBox)
            return;
        // 그 외 위치에서는 동작 차단 + 인풋으로 포커스 이동
        e.preventDefault();
        e.stopPropagation();
        searchBox.focus();
    };
    // ===== Handlers =====
    const onOpen = () => {
        modal.style.display = "flex";
        if (!map) {
            setTimeout(() => {
                // keyboard:false → Leaflet가 스페이스/화살표 등 키를 먹지 않게
                map = L.map(mapId, { keyboard: false }).setView([initialCenter.lat, initialCenter.lon], 11);
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "© OpenStreetMap",
                }).addTo(map);
                map.invalidateSize();
            }, 0);
        }
        else {
            setTimeout(() => map?.invalidateSize(), 200);
        }
        // 스페이스 전역 가드: 캡처 단계에서 먼저 잡아버림
        modal.addEventListener("keydown", onSpaceGuard, true);
        modal.addEventListener("keyup", onSpaceGuard, true);
        searchBox.focus(); // 인풋 포커스만 유지 (리스트엔 절대 포커스 X)
    };
    const onClose = () => {
        modal.style.display = "none";
        searchBox.value = "";
        suggList.innerHTML = "";
        if (debounceTimer) {
            window.clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        // 가드 해제
        modal.removeEventListener("keydown", onSpaceGuard, true);
        modal.removeEventListener("keyup", onSpaceGuard, true);
    };
    // 리스트 아이템 선택
    const chooseFromLi = (li) => {
        const name = li.dataset.name ?? "";
        const lat = Number(li.dataset.lat ?? "");
        const lon = Number(li.dataset.lon ?? "");
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !map)
            return;
        if (!marker)
            marker = L.marker([lat, lon]).addTo(map);
        else
            marker.setLatLng([lat, lon]);
        map.flyTo([lat, lon], 14, { duration: 0.5 });
        // input value / data-* 갱신
        placeInput.value = name;
        placeInput.dataset.lat = String(lat);
        placeInput.dataset.lon = String(lon);
        // 콜백
        opts.onSelected?.({ name, lat, lon });
        // 목록/모달 닫기
        suggList.innerHTML = "";
        onClose();
    };
    // 검색 입력 (디바운스) — 자동 포커스 없음
    const onInput = () => {
        if (debounceTimer)
            window.clearTimeout(debounceTimer);
        const q = searchBox.value.trim();
        if (!q) {
            suggList.innerHTML = "";
            return;
        }
        debounceTimer = window.setTimeout(async () => {
            try {
                const url = "https://nominatim.openstreetmap.org/search" +
                    "?format=jsonv2&limit=12" +
                    "&accept-language=ko" +
                    "&addressdetails=1&dedupe=1" +
                    "&email=unique950318@gmail.com" +
                    "&q=" + encodeURIComponent(q);
                const res = await fetch(url, { headers: { Accept: "application/json" } });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const rows = (await res.json());
                if (!Array.isArray(rows) || rows.length === 0) {
                    suggList.innerHTML = `<li style="padding:8px">결과 없음</li>`;
                    return;
                }
                const items = rows.slice(0, 12).map((r, idx) => {
                    const label = r.display_name.split(",").slice(0, 3).map(s => s.trim()).join(" · ");
                    // 첫 번째 항목만 ‘활성’ 배경 하이라이트 (포커스 아님)
                    const baseStyle = "padding:8px;cursor:pointer;outline:none;";
                    const activeStyle = idx === 0 ? "background-color:#1f2937;border-radius:4px;" : "";
                    return `<li
                    role="option"
                    data-name="${esc(label)}"
                    data-lat="${esc(r.lat)}"
                    data-lon="${esc(r.lon)}"
                    data-active="${idx === 0 ? "1" : "0"}"
                    style="${baseStyle}${activeStyle}"
                  >${esc(label)}</li>`;
                }).join("");
                suggList.innerHTML = items;
            }
            catch (e) {
                console.error(e);
                suggList.innerHTML = `<li style="padding:8px;color:#b91c1c">검색 오류</li>`;
            }
        }, 250);
    };
    // 리스트 클릭 선택
    const onPick = (e) => {
        const target = e.target;
        if (target.tagName === "LI")
            chooseFromLi(target);
    };
    // 인풋 Enter = 첫 항목 선택 (포커스 없이도 동작)
    const onSearchBoxKeyDown = (e) => {
        if (e.key === "Enter") {
            const first = suggList.querySelector('li[data-active="1"]')
                ?? suggList.querySelector("li");
            if (first)
                chooseFromLi(first);
        }
    };
    // ===== Bind =====
    placeBtn.addEventListener("click", onOpen);
    mapCloseBtn.addEventListener("click", onClose);
    if (closeMap)
        closeMap.addEventListener("click", onClose);
    searchBox.addEventListener("input", onInput);
    searchBox.addEventListener("keydown", onSearchBoxKeyDown);
    suggList.addEventListener("click", onPick);
    // ===== Cleanup =====
    return () => {
        placeBtn.removeEventListener("click", onOpen);
        mapCloseBtn.removeEventListener("click", onClose);
        if (closeMap)
            closeMap.removeEventListener("click", onClose);
        searchBox.removeEventListener("input", onInput);
        searchBox.removeEventListener("keydown", onSearchBoxKeyDown);
        suggList.removeEventListener("click", onPick);
        modal.removeEventListener("keydown", onSpaceGuard, true);
        modal.removeEventListener("keyup", onSpaceGuard, true);
        if (debounceTimer) {
            window.clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (map) {
            map.remove();
            map = null;
        }
    };
}
