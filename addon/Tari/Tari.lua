-- Tari: /tari exports a paste-able character string. docs/CHARACTER.md.
--
-- Format (TA1) — WP2 under a new prefix, five fields added, nothing changed:
--   TA1;CLASS;Faction;level;G:gear;Q:quests;S:spells;P:profs;N:name;E:realm;
--       B:bags;T:talents;R:reps;H:hearth;Z:zone;A:race;X:sex;U:guild;W:played;
--       J:journal;M:copper
--   G: 19 slot itemIds in slot order, 0 = empty, comma-separated
--   Q/S/B: sorted ids, base36 first id then base36 deltas, dot-separated
--   P: Name=rank pairs · T: points per talent tree · R: Name=standingId pairs
--   H: hearth · Z: zone at export · N: name · E: realm — plain text
--   A: race token · X: sex (2 male, 3 female) · U: guild · W: seconds played
--   J: the journal — kind|zone|level|time entries, dot-separated. Kinds:
--      l levelled · z entered a zone · d died · q turned in a quest.
--      Time is unix seconds, base36. See "the journal" below.
--   A field with nothing to say is left out; the site reads the tail by key.

local DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"

-- The factions that gate an item, a recipe or a door at sixty. Not all of them.
local FACTIONS = {
  ["Argent Dawn"] = true,
  ["Timbermaw Hold"] = true,
  ["Thorium Brotherhood"] = true,
  ["Cenarion Circle"] = true,
  ["Hydraxian Waterlords"] = true,
  ["Brood of Nozdormu"] = true,
  ["Zandalar Tribe"] = true,
}

local JOURNAL_MAX = 500

local function b36(n)
  if n == 0 then return "0" end
  local s = ""
  while n > 0 do
    local r = n % 36
    s = DIGITS:sub(r + 1, r + 1) .. s
    n = math.floor(n / 36)
  end
  return s
end

-- sorted ids -> "first.d1.d2..." (deltas), all base36
local function encodeIds(ids)
  if not ids or #ids == 0 then return "" end
  table.sort(ids)
  local out = { b36(ids[1]) }
  for i = 2, #ids do
    out[#out + 1] = b36(ids[i] - ids[i - 1])
  end
  return table.concat(out, ".")
end

-- The string is cut on ";" and ":", journal entries on "." and "|". Strip all
-- four from anything a player or a locale could have typed.
local function clean(s)
  if not s or s == "" then return "" end
  return (tostring(s):gsub("[;:.|]", ""))
end

local function db()
  TariChar = TariChar or {}
  TariChar.journal = TariChar.journal or {}
  return TariChar
end

-- ---------------------------------------------------------------- the bags

local function bagSlots(bag)
  if C_Container and C_Container.GetContainerNumSlots then
    return C_Container.GetContainerNumSlots(bag)
  end
  return GetContainerNumSlots(bag) or 0
end

local function bagLink(bag, slot)
  if C_Container and C_Container.GetContainerItemLink then
    return C_Container.GetContainerItemLink(bag, slot)
  end
  return GetContainerItemLink(bag, slot)
end

local function collectBags(bags, out)
  for _, bag in ipairs(bags) do
    for slot = 1, bagSlots(bag) do
      local link = bagLink(bag, slot)
      local id = link and tonumber(link:match("item:(%d+)"))
      if id then out[#out + 1] = id end
    end
  end
end

local function gearIds()
  local t = {}
  for slot = 1, 19 do
    local link = GetInventoryItemLink("player", slot)
    t[#t + 1] = link and tonumber(link:match("item:(%d+)")) or 0
  end
  return t
end

local function gear()
  return table.concat(gearIds(), ",")
end

-- The bank is only readable while its frame is open, so it is cached on every
-- visit and the cache is what ships. Per character: a bank is not shared.
local function cacheBank()
  local ids = {}
  collectBags({ -1, 5, 6, 7, 8, 9, 10, 11 }, ids)
  db().bank = ids
end

local function bagsAndBank()
  local ids = {}
  collectBags({ 0, 1, 2, 3, 4 }, ids)
  for _, id in ipairs(db().bank or {}) do
    ids[#ids + 1] = id
  end
  local worn = {}
  for _, id in ipairs(gearIds()) do
    if id > 0 then worn[id] = true end
  end
  local seen, out = {}, {}
  for _, id in ipairs(ids) do
    if not worn[id] and not seen[id] then
      seen[id] = true
      out[#out + 1] = id
    end
  end
  return encodeIds(out)
end

-- ---------------------------------------------------------------- the book

local function completedQuests()
  if C_QuestLog and C_QuestLog.GetAllCompletedQuestIDs then
    return encodeIds(C_QuestLog.GetAllCompletedQuestIDs())
  end
  if GetQuestsCompleted then
    local ids, map = {}, GetQuestsCompleted()
    for id in pairs(map or {}) do ids[#ids + 1] = id end
    return encodeIds(ids)
  end
  return ""
end

local function knownSpells()
  local ids = {}
  for tab = 1, GetNumSpellTabs() do
    local _, _, offset, num = GetSpellTabInfo(tab)
    for i = offset + 1, offset + num do
      local kind, id = GetSpellBookItemInfo(i, BOOKTYPE_SPELL or "spell")
      if id and kind ~= "FUTURESPELL" then ids[#ids + 1] = id end
    end
  end
  return encodeIds(ids)
end

local function professions()
  local t = {}
  for i = 1, GetNumSkillLines() do
    local name, isHeader, _, rank, _, _, maxRank = GetSkillLineInfo(i)
    if not isHeader and maxRank and maxRank > 1 then
      t[#t + 1] = name .. "=" .. rank
    end
  end
  return table.concat(t, ",")
end

-- Points per tree, added up from the rows; the tab total lies on some clients.
local function talents()
  if not GetNumTalentTabs or not GetNumTalents or not GetTalentInfo then
    return ""
  end
  local t = {}
  for tab = 1, GetNumTalentTabs() do
    local spent
    if GetTalentTabInfo then
      local _, _, points = GetTalentTabInfo(tab)
      spent = tonumber(points)
    end
    if not spent then
      spent = 0
      for i = 1, GetNumTalents(tab) do
        local _, _, _, _, rank = GetTalentInfo(tab, i)
        spent = spent + (tonumber(rank) or 0)
      end
    end
    t[#t + 1] = spent
  end
  return table.concat(t, ".")
end

-- Standings for FACTIONS. Collapsed headers are opened to read and put back.
local function reputations()
  if not GetNumFactions or not GetFactionInfo then return "" end
  local opened, out = {}, {}
  local i = 1
  while i <= GetNumFactions() do
    local name, _, standing, _, _, _, _, _, isHeader, isCollapsed = GetFactionInfo(i)
    if not name then break end
    if isHeader and isCollapsed and ExpandFactionHeader then
      opened[name] = true
      ExpandFactionHeader(i)
    else
      if not isHeader and FACTIONS[name] and standing then
        out[#out + 1] = name .. "=" .. standing
      end
      i = i + 1
    end
  end
  if CollapseFactionHeader then
    local j = 1
    while j <= GetNumFactions() do
      local name, _, _, _, _, _, _, _, isHeader, isCollapsed = GetFactionInfo(j)
      if not name then break end
      if isHeader and not isCollapsed and opened[name] then
        CollapseFactionHeader(j)
      end
      j = j + 1
    end
  end
  return table.concat(out, ",")
end

-- ---------------------------------------------------------------- the journal
--
-- One line per thing worth remembering, written as it happens, capped at the
-- last JOURNAL_MAX. Nothing here is a position: where you stood on the map is
-- a route in disguise until there are pins to hang it on (docs/CHARACTER.md).

local lastZone

local function note(kind, zone)
  local j = db().journal
  j[#j + 1] = { kind, clean(zone or (GetRealZoneText and GetRealZoneText()) or ""), UnitLevel("player"), time() }
  while #j > JOURNAL_MAX do table.remove(j, 1) end
end

local function journal()
  local out = {}
  for _, e in ipairs(db().journal) do
    out[#out + 1] = e[1] .. "|" .. e[2] .. "|" .. e[3] .. "|" .. b36(e[4])
  end
  return table.concat(out, ".")
end

local function onZone()
  local zone = GetRealZoneText and GetRealZoneText() or ""
  if zone ~= "" and zone ~= lastZone then
    lastZone = zone
    note("z", zone)
  end
end

-- ---------------------------------------------------------------- the string

local function field(key, value)
  if not value or value == "" then return nil end
  return key .. ":" .. value
end

local function buildString()
  local _, class = UnitClass("player")
  local _, raceToken = UnitRace("player")
  local parts = {
    "TA1",
    class,
    UnitFactionGroup("player") or "",
    UnitLevel("player"),
    "G:" .. gear(),
    "Q:" .. completedQuests(),
    "S:" .. knownSpells(),
    "P:" .. professions(),
  }
  local tail = {
    field("N", clean(UnitName and UnitName("player") or "")),
    field("E", clean(GetRealmName and GetRealmName() or "")),
    field("B", bagsAndBank()),
    field("T", talents()),
    field("R", reputations()),
    field("H", clean(GetBindLocation and GetBindLocation() or "")),
    field("Z", clean(GetRealZoneText and GetRealZoneText() or "")),
    field("A", raceToken),
    field("X", UnitSex and UnitSex("player") or nil),
    field("U", clean(GetGuildInfo and GetGuildInfo("player") or "")),
    field("W", db().played),
    field("J", journal()),
  }
  for _, part in ipairs(tail) do
    if part then parts[#parts + 1] = part end
  end
  parts[#parts + 1] = "M:" .. GetMoney()
  return table.concat(parts, ";")
end

-- ---------------------------------------------------------------- the window
--
-- The site's night stock: near-black ground, chalk ink, the Seduction pink
-- spent on the selection and nothing else. No texture: the client draws a
-- flat plate with a hairline, which is what the site does too.

local GROUND = { 0.024, 0.024, 0.039 } -- #06060a
local INK    = { 0.949, 0.941, 0.918 } -- #f2f0ea
local MUTED  = { 0.949, 0.941, 0.918, 0.62 }
local RULE   = { 0.949, 0.941, 0.918, 0.22 }
local SEDUCE = { 1.000, 0.310, 0.545 } -- #ff4f8b

local function setFont(fs, path, size)
  if not fs:SetFont(path, size, "") then
    fs:SetFont(GameFontNormal:GetFont(), size, "")
  end
end

local frame

local function build()
  frame = CreateFrame("Frame", "TariFrame", UIParent, BackdropTemplateMixin and "BackdropTemplate" or nil)
  frame:SetSize(480, 176)
  frame:SetPoint("CENTER")
  frame:SetFrameStrata("DIALOG")
  frame:SetMovable(true)
  frame:EnableMouse(true)
  frame:RegisterForDrag("LeftButton")
  frame:SetScript("OnDragStart", frame.StartMoving)
  frame:SetScript("OnDragStop", frame.StopMovingOrSizing)

  if frame.SetBackdrop then
    frame:SetBackdrop({ bgFile = "Interface\\Buttons\\WHITE8x8", edgeFile = "Interface\\Buttons\\WHITE8x8", edgeSize = 1 })
    frame:SetBackdropColor(GROUND[1], GROUND[2], GROUND[3], 0.96)
    frame:SetBackdropBorderColor(RULE[1], RULE[2], RULE[3], RULE[4])
  end

  local wordmark = frame:CreateFontString(nil, "OVERLAY")
  setFont(wordmark, "Fonts\\FRIZQT__.TTF", 16)
  wordmark:SetTextColor(unpack(INK))
  wordmark:SetPoint("TOP", 0, -26)
  wordmark:SetText("Tari")

  local line = frame:CreateFontString(nil, "OVERLAY")
  setFont(line, "Fonts\\ARIALN.TTF", 10)
  line:SetTextColor(MUTED[1], MUTED[2], MUTED[3], MUTED[4])
  line:SetPoint("TOP", 0, -50)
  line:SetText("YOUR CHARACTER, AS A LINE OF TEXT")

  -- The well: a darker inset with its own hairline.
  local well = CreateFrame("Frame", nil, frame, BackdropTemplateMixin and "BackdropTemplate" or nil)
  well:SetPoint("TOPLEFT", 28, -72)
  well:SetPoint("BOTTOMRIGHT", -28, 44)
  if well.SetBackdrop then
    well:SetBackdrop({ bgFile = "Interface\\Buttons\\WHITE8x8", edgeFile = "Interface\\Buttons\\WHITE8x8", edgeSize = 1 })
    well:SetBackdropColor(0, 0, 0, 0.5)
    well:SetBackdropBorderColor(RULE[1], RULE[2], RULE[3], 0.12)
  end

  local eb = CreateFrame("EditBox", nil, well)
  eb:SetPoint("TOPLEFT", 10, -6)
  eb:SetPoint("BOTTOMRIGHT", -10, 6)
  setFont(eb, "Fonts\\ARIALN.TTF", 12)
  eb:SetTextColor(unpack(INK))
  eb:SetJustifyH("CENTER")
  if eb.SetHighlightColor then
    eb:SetHighlightColor(SEDUCE[1], SEDUCE[2], SEDUCE[3], 0.35)
  end
  eb:SetAutoFocus(true)
  eb:SetScript("OnEscapePressed", function(self)
    self:ClearFocus()
    frame:Hide()
  end)
  -- Keep the string intact and selected whatever is typed.
  eb:SetScript("OnChar", function(self)
    self:SetText(frame.exportText)
    self:HighlightText()
  end)
  eb:SetScript("OnEditFocusGained", function(self) self:HighlightText() end)
  frame.eb = eb

  local hint = frame:CreateFontString(nil, "OVERLAY")
  setFont(hint, "Fonts\\ARIALN.TTF", 10)
  hint:SetTextColor(MUTED[1], MUTED[2], MUTED[3], MUTED[4])
  hint:SetPoint("BOTTOM", 0, 20)
  hint:SetText("ctrl+c \194\183 esc")

  tinsert(UISpecialFrames, "TariFrame")
end

local function showExport()
  local text = buildString()
  if not frame then build() end
  frame.exportText = text
  frame.eb:SetText(text)
  frame.eb:SetFocus()
  frame.eb:HighlightText()
  frame:Show()
end

-- ---------------------------------------------------------------- listening

local watcher = CreateFrame("Frame")
watcher:RegisterEvent("PLAYER_ENTERING_WORLD")
watcher:RegisterEvent("ZONE_CHANGED_NEW_AREA")
watcher:RegisterEvent("PLAYER_LEVEL_UP")
watcher:RegisterEvent("PLAYER_DEAD")
watcher:RegisterEvent("QUEST_TURNED_IN")
watcher:RegisterEvent("TIME_PLAYED_MSG")
watcher:RegisterEvent("BANKFRAME_OPENED")
watcher:RegisterEvent("PLAYERBANKSLOTS_CHANGED")
watcher:SetScript("OnEvent", function(_, event, arg1)
  if event == "PLAYER_ENTERING_WORLD" then
    db()
    -- Played time arrives later as TIME_PLAYED_MSG; asked once per session.
    if RequestTimePlayed then RequestTimePlayed() end
    onZone()
  elseif event == "ZONE_CHANGED_NEW_AREA" then
    onZone()
  elseif event == "PLAYER_LEVEL_UP" then
    note("l")
  elseif event == "PLAYER_DEAD" then
    note("d")
  elseif event == "QUEST_TURNED_IN" then
    note("q")
  elseif event == "TIME_PLAYED_MSG" then
    db().played = tonumber(arg1)
  else
    cacheBank()
  end
end)

SLASH_TARI1 = "/tari"
SLASH_TARI2 = "/ta"
SlashCmdList.TARI = showExport
