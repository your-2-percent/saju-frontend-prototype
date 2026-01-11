# src structure

Current src tree:

```text
src
|-- analysisReport
|   |-- calc
|   |   |-- core
|   |   |   +-- common.ts
|   |   |-- logic
|   |   |   |-- gyeokguk
|   |   |   |   |-- evaluator.ts
|   |   |   |   |-- formatter.ts
|   |   |   |   |-- formatterTooltips.ts
|   |   |   |   |-- gyeokgukYongshin.ts
|   |   |   |   |-- index.ts
|   |   |   |   |-- mulsang.ts
|   |   |   |   |-- outerEvaluator.ts
|   |   |   |   |-- outerGyeokTooltips.ts
|   |   |   |   |-- resolver.ts
|   |   |   |   |-- rules.ts
|   |   |   |   |-- rulesTooltips.ts
|   |   |   |   |-- structureTags.ts
|   |   |   |   |-- structureTagTooltips.ts
|   |   |   |   |-- termTooltips.ts
|   |   |   |   |-- types.ts
|   |   |   |   +-- utils.ts
|   |   |   |-- relations
|   |   |   |   |-- buckets.ts
|   |   |   |   |-- buildAllRelationTags.ts
|   |   |   |   |-- buildHarmonyTags.ts
|   |   |   |   |-- constants.ts
|   |   |   |   |-- coreUtils.ts
|   |   |   |   |-- couple.ts
|   |   |   |   |-- groups.ts
|   |   |   |   |-- merge.ts
|   |   |   |   |-- normalize.ts
|   |   |   |   |-- overlay.ts
|   |   |   |   |-- tables.ts
|   |   |   |   +-- types.ts
|   |   |   |-- shinsal
|   |   |   |   |-- calc
|   |   |   |   |   |-- luck.ts
|   |   |   |   |   +-- natal.ts
|   |   |   |   |-- core
|   |   |   |   |   |-- common.ts
|   |   |   |   |   |-- find.ts
|   |   |   |   |   |-- labels.ts
|   |   |   |   |   |-- normalize.ts
|   |   |   |   |   +-- pos.ts
|   |   |   |   |-- maps
|   |   |   |   |   |-- dayStem.ts
|   |   |   |   |   |-- month.ts
|   |   |   |   |   +-- year.ts
|   |   |   |   |-- output
|   |   |   |   |   |-- index.ts
|   |   |   |   |   +-- posToKey.ts
|   |   |   |   |-- buildShinsalTags.ts
|   |   |   |   |-- shinsalTooltips.ts
|   |   |   |   +-- types.ts
|   |   |   |-- blend.ts
|   |   |   |-- gyeokguk.ts
|   |   |   |-- normalizeStemSubs.ts
|   |   |   |-- powerPercent.ts
|   |   |   |-- relations.ts
|   |   |   |-- shinGang.ts
|   |   |   |-- shinsal.ts
|   |   |   +-- shinStrength.ts
|   |   |-- utils
|   |   |   |-- colors.ts
|   |   |   |-- computePowerData.ts
|   |   |   |-- hiddenStem.ts
|   |   |   |-- powerPercentSync.ts
|   |   |   |-- strength.ts
|   |   |   |-- tenGod.ts
|   |   |   |-- tenGodSubStrength.ts
|   |   |   |-- tonggeun.ts
|   |   |   |-- types.ts
|   |   |   +-- unifiedPower.ts
|   |   |-- yongshin
|   |   |   |-- computeYongshin.ts
|   |   |   |-- fromGyeokguk.ts
|   |   |   |-- helpers.ts
|   |   |   |-- index.ts
|   |   |   |-- multi.ts
|   |   |   |-- scorers.ts
|   |   |   |-- tables.ts
|   |   |   |-- types.ts
|   |   |   +-- useLuckYongshin.ts
|   |   |-- index.ts
|   |   |-- powerDataBuilders.ts
|   |   |-- powerDataPrimitives.ts
|   |   |-- powerDataTypes.ts
|   |   |-- reportCalc.ts
|   |   +-- useAnalysisReportCalc.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- useAnalysisReportInput.ts
|   |   |-- useClimatePercents.ts
|   |   +-- usePromptSections.ts
|   |-- save
|   |   |-- finalize.ts
|   |   +-- index.ts
|   |-- saveInterface
|   |   |-- analysisReportRepo.ts
|   |   +-- index.ts
|   +-- ui
|       |-- ClimateBars.tsx
|       |-- GyeokgukTagPanel.tsx
|       |-- HarmonyTagPanel.tsx
|       |-- index.tsx
|       |-- LuckCustomInput.tsx
|       |-- MonthRangePicker.tsx
|       |-- PentagonChart.tsx
|       |-- ShinsalTagPanel.tsx
|       |-- StrengthBar.tsx
|       |-- YongshinLuckDiffPanel.tsx
|       +-- YongshinRecommendCard.tsx
|-- app
|   |-- admin
|   |   |-- components
|   |   |   |-- AdminLayout.tsx
|   |   |   |-- AdminModal.tsx
|   |   |   +-- RequireRole.tsx
|   |   |-- dashboard
|   |   |   +-- page.tsx
|   |   |-- home
|   |   |   +-- index.tsx
|   |   |-- hooks
|   |   |   +-- useAdminRole.ts
|   |   |-- log
|   |   |   +-- index.tsx
|   |   |-- myeongsik
|   |   |   +-- [id].tsx
|   |   |-- roles
|   |   |   +-- index.tsx
|   |   |-- user
|   |   |   |-- calc
|   |   |   |   |-- adminUserCalc.ts
|   |   |   |   +-- planUtils.ts
|   |   |   |-- detail
|   |   |   |   |-- calc
|   |   |   |   |   +-- useAdminUserDetailCalc.ts
|   |   |   |   |-- input
|   |   |   |   |   +-- useAdminUserDetailInput.ts
|   |   |   |   |-- model
|   |   |   |   |   +-- types.ts
|   |   |   |   |-- save
|   |   |   |   |   +-- useAdminUserDetailSave.ts
|   |   |   |   +-- saveInterface
|   |   |   |       +-- adminUserDetailRepo.ts
|   |   |   |-- input
|   |   |   |   +-- useAdminUserInput.ts
|   |   |   |-- model
|   |   |   |   +-- types.ts
|   |   |   |-- save
|   |   |   |   |-- repo
|   |   |   |   |   +-- fetchUserActivity.ts
|   |   |   |   +-- useAdminUserSave.ts
|   |   |   |-- saveInterface
|   |   |   |   +-- adminUserRepo.ts
|   |   |   |-- [userId].tsx
|   |   |   +-- index.tsx
|   |   +-- AdminPage.tsx
|   |-- components
|   |   |-- PromptCopyCard.tsx
|   |   +-- tab.tsx
|   |-- faq
|   |   +-- FaqPage.tsx
|   |-- impersonate
|   |   +-- page.tsx
|   |-- layout
|   |   |-- login
|   |   |-- page
|   |   |   |-- calc
|   |   |   |   |-- useMainAppCalc.ts
|   |   |   |   +-- usePageCalc.ts
|   |   |   |-- input
|   |   |   |   |-- useMainAppInput.ts
|   |   |   |   +-- usePageInput.ts
|   |   |   |-- save
|   |   |   |   |-- useMainAppSave.ts
|   |   |   |   +-- usePageSave.ts
|   |   |   +-- saveInterface
|   |   |       +-- useAuthState.ts
|   |   +-- Page.tsx
|   |-- maintenance
|   |   +-- MaintenancePage.tsx
|   |-- pages
|   |   |-- couple
|   |   |   |-- coupleUtils.ts
|   |   |   |-- FourPillarsRow.tsx
|   |   |   |-- PeoplePickerModal.tsx
|   |   |   +-- PersonSlot.tsx
|   |   |-- saju
|   |   |   |-- calc
|   |   |   +-- ui
|   |   |       +-- etcShinsal
|   |   |-- AccountDisabled.tsx
|   |   |-- CoupleHarmonyPanel.tsx
|   |   |-- CoupleViewer.tsx
|   |   +-- Footer.tsx
|   |-- AccountDisabledGate.tsx
|   |-- AppBootstrap.tsx
|   |-- AppShell.tsx
|   |-- HeartbeatGate.tsx
|   |-- main.css
|   +-- main.tsx
|-- auth
|   |-- calc
|   |   |-- authRoutes.ts
|   |   |-- index.ts
|   |   +-- redirectCalc.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- loginNudgeStore.ts
|   |   |-- loginUiStore.ts
|   |   |-- useAuthUserId.ts
|   |   +-- useLoginInput.ts
|   |-- save
|   |   |-- index.ts
|   |   |-- useLoginSave.ts
|   |   +-- useLogoutSave.ts
|   |-- saveInterface
|   |   |-- authRepo.ts
|   |   |-- index.ts
|   |   +-- supabaseAuthRepo.ts
|   +-- ui
|       |-- AuthCallbackPage.tsx
|       |-- index.ts
|       |-- KakaoLoginButton.tsx
|       |-- LoginButton.tsx
|       |-- LoginInlineNudge.tsx
|       |-- LoginModal.tsx
|       |-- LoginNudgeModal.tsx
|       +-- LoginPage.tsx
|-- features
|   |-- CustomSaju
|   |   |-- calc
|   |   |   |-- ganjiRules.ts
|   |   |   |-- pillarRules.ts
|   |   |   |-- searchMatches.ts
|   |   |   +-- useCustomSajuCalc.ts
|   |   |-- input
|   |   |   |-- customSajuTypes.ts
|   |   |   +-- useCustomSajuInput.ts
|   |   |-- save
|   |   |   |-- buildPayload.ts
|   |   |   +-- useCustomSajuSave.ts
|   |   |-- storage
|   |   |   +-- myeongSikRepo.ts
|   |   |-- ui
|   |   |   |-- MonthBranchChoices.tsx
|   |   |   |-- OptionsPanel.tsx
|   |   |   |-- PillarGrid.tsx
|   |   |   |-- ResultsTable.tsx
|   |   |   |-- SelectionPanel.tsx
|   |   |   +-- ToastLayer.tsx
|   |   +-- CustomSajuModal.tsx
|   |-- myoun
|   |   |-- calc
|   |   |   |-- age.ts
|   |   |   |-- ganjiCycle.ts
|   |   |   |-- normalize.ts
|   |   |   |-- pillars.ts
|   |   |   |-- siju.ts
|   |   |   |-- solarTerms.ts
|   |   |   |-- time.ts
|   |   |   +-- wolju.ts
|   |   |-- input
|   |   |   +-- birth.ts
|   |   |-- output
|   |   |   +-- logging.ts
|   |   |-- index.ts
|   |   +-- MyoUnViewer.tsx
|   |-- place-picker
|   |   |-- calc
|   |   |   +-- domHelpers.ts
|   |   |-- input
|   |   |   +-- useBirthPlacePickerInput.ts
|   |   |-- save
|   |   |   +-- useBirthPlacePickerSave.ts
|   |   |-- BirthPlacePicker.tsx
|   |   +-- place-picker.ts
|   |-- prompt
|   |   |-- calc
|   |   |   |-- ganjiMaps.ts
|   |   |   |-- nabeum.ts
|   |   |   |-- normalizeStem.ts
|   |   |   |-- normalizeTo100.ts
|   |   |   +-- tenGod.ts
|   |   |-- input
|   |   |   +-- ensureSolarBirthDay.ts
|   |   |-- multi
|   |   |   |-- sections
|   |   |   |   |-- daeSelectedSections.ts
|   |   |   |   |-- ilDaySections.ts
|   |   |   |   |-- seYearSections.ts
|   |   |   |   +-- wolMonthSections.ts
|   |   |   |-- buildLuckBlock.ts
|   |   |   |-- luckLookup.ts
|   |   |   |-- sectionUtils.ts
|   |   |   +-- types.ts
|   |   |-- single
|   |   |   +-- gzItems.ts
|   |   |-- topicGuide
|   |   |   |-- baseGuide.ts
|   |   |   |-- buildTopicGuide.ts
|   |   |   |-- timeModeGuide.ts
|   |   |   |-- topicGuides.ts
|   |   |   |-- topicGuidesA.ts
|   |   |   |-- topicGuidesB.ts
|   |   |   +-- types.ts
|   |   |-- buildPrompt.ts
|   |   |-- buildPromptJsonOnly.ts
|   |   |-- buildPromptMulti.ts
|   |   |-- buildPromptSingle.ts
|   |   |-- formatBirth.ts
|   |   |-- natalFromMs.ts
|   |   |-- partnerInfo.ts
|   |   |-- promptCore.ts
|   |   |-- promptOverlay.ts
|   |   |-- promptPosLabels.ts
|   |   |-- promptSectionToggles.ts
|   |   |-- sectionFormat.ts
|   |   |-- topicGuide.ts
|   |   |-- topicGuideData.ts
|   |   +-- useLuckChain.ts
|   +-- relationship
|       +-- RelationshipSelector.tsx
|-- iching
|   |-- calc
|   |   |-- buildPeriodCards.ts
|   |   |-- drawerTypes.ts
|   |   |-- ganzhi.ts
|   |   |-- ichingDrawerUtils.ts
|   |   |-- ichingPrompt.ts
|   |   |-- ichingTypes.ts
|   |   |-- index.ts
|   |   |-- period.ts
|   |   |-- sixYaoResultUtils.ts
|   |   +-- useIChingSixYaoDrawer.ts
|   |-- input
|   |   |-- index.ts
|   |   +-- useIChingInput.ts
|   |-- save
|   |   |-- index.ts
|   |   +-- useIChingSave.ts
|   |-- saveInterface
|   |   |-- ichingRepo.ts
|   |   +-- index.ts
|   +-- ui
|       |-- HexagramView.tsx
|       |-- IChingSixYaoDrawer.tsx
|       |-- IChingSixYaoPage.tsx
|       |-- index.ts
|       |-- LineBar.tsx
|       |-- SixYaoLineRow.tsx
|       +-- SixYaoResultCard.tsx
|-- lib
|   |-- audit.ts
|   |-- database.types.ts
|   |-- supabase.ts
|   |-- supabaseAdmin.ts
|   |-- supabaseClient.ts
|   +-- types.ts
|-- luck
|   |-- calc
|   |   |-- active.ts
|   |   |-- daewoonList.ts
|   |   |-- dateUtils.ts
|   |   |-- index.ts
|   |   |-- luck-make.ts
|   |   |-- luckUiUtils.ts
|   |   |-- solarTermUtils.ts
|   |   |-- termUtils.ts
|   |   |-- useDaewoonList.tsx
|   |   |-- useGlobalLuck.ts
|   |   |-- useIlwoonCalendarCalc.ts
|   |   |-- useSewoonList.ts
|   |   +-- withSafeClockForUnknownTime.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- useIlwoonCalendarInput.ts
|   |   +-- useLuckPickerStore.ts
|   |-- save
|   |   |-- index.ts
|   |   +-- useIlwoonCalendarSave.ts
|   |-- saveInterface
|   |   |-- index.ts
|   |   +-- luckRepo.ts
|   +-- ui
|       |-- DaewoonList.tsx
|       |-- DateTimePicker.tsx
|       |-- IlwoonCalendar.tsx
|       |-- index.ts
|       |-- LuckGlobalPicker.tsx
|       |-- SewoonList.tsx
|       |-- Viewer.tsx
|       +-- WolwoonList.tsx
|-- myeongsik
|   |-- calc
|   |   |-- myeongsikList
|   |   |   |-- calc
|   |   |   |   |-- folders.ts
|   |   |   |   +-- search.ts
|   |   |   |-- model
|   |   |   |   |-- constants.ts
|   |   |   |   +-- types.ts
|   |   |   +-- ops.ts
|   |   |-- myeongsikStore
|   |   |   |-- dndArgs.ts
|   |   |   |-- guards.ts
|   |   |   |-- guestListStorage.ts
|   |   |   |-- mappers.ts
|   |   |   |-- realtimeReducer.ts
|   |   |   |-- reorderQueue.ts
|   |   |   |-- staleSession.ts
|   |   |   +-- types.ts
|   |   |-- derive.ts
|   |   |-- displayValue.ts
|   |   |-- ensureSolarBirthDay.ts
|   |   |-- folderOptions.ts
|   |   |-- formDerive.ts
|   |   |-- index.ts
|   |   |-- input.ts
|   |   |-- inputWizardConfig.ts
|   |   |-- inputWizardValidation.ts
|   |   |-- lunarPreview.ts
|   |   |-- useInputWizardCalc.ts
|   |   |-- useMyeongSikEditorCalc.ts
|   |   +-- validation.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- useInputWizardFocus.ts
|   |   |-- useInputWizardInput.ts
|   |   |-- useInputWizardModel.ts
|   |   |-- useMyeongSikEditorInput.ts
|   |   +-- useMyeongSikStore.ts
|   |-- model
|   |   +-- types.ts
|   |-- save
|   |   |-- buildMyeongSikPayload.ts
|   |   |-- guestMyeongsikStorage.ts
|   |   |-- index.ts
|   |   |-- migrateLocalToServer.ts
|   |   |-- saveMyeongsikSmart.ts
|   |   |-- useInputWizardSave.ts
|   |   +-- useMyeongSikEditorSave.ts
|   |-- saveInterface
|   |   |-- folderStorage.ts
|   |   |-- index.ts
|   |   |-- ports.ts
|   |   |-- supabaseRepo.ts
|   |   +-- useMyeongSikRepo.ts
|   +-- ui
|       |-- index.ts
|       |-- InputAppPage.tsx
|       |-- MyeongSikEditorPage.tsx
|       |-- SajuForm.tsx
|       +-- SajuList.tsx
|-- promptCopy
|   |-- calc
|   |   |-- ganjiNormalize.ts
|   |   |-- index.ts
|   |   |-- infoOnly.ts
|   |   |-- meta.ts
|   |   |-- promptCopyCalc.ts
|   |   |-- promptTextUtils.ts
|   |   |-- types.ts
|   |   +-- usePromptCopyCalc.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- promptCopySectionsStore.ts
|   |   |-- useMultiRangeControls.ts
|   |   |-- usePromptCopyInput.ts
|   |   +-- usePromptCopyModel.ts
|   |-- save
|   |   |-- index.ts
|   |   |-- useClipboardCopy.ts
|   |   +-- usePromptCopySave.ts
|   |-- saveInterface
|   |   |-- index.ts
|   |   +-- useAuthUserId.ts
|   +-- ui
|       |-- CategorySelectors.tsx
|       |-- ExtraQuestionsEditor.tsx
|       |-- index.ts
|       |-- ModeSwitch.tsx
|       |-- MultiModeControls.tsx
|       |-- PromptCopyCard.tsx
|       |-- PromptCopyHeader.tsx
|       |-- PromptOutput.tsx
|       |-- PromptSectionsToggle.tsx
|       |-- RelationSelectors.tsx
|       |-- SingleModeControls.tsx
|       +-- TonePicker.tsx
|-- saju
|   |-- calc
|   |   |-- index.ts
|   |   |-- sajuFormat.ts
|   |   |-- sajuHour.ts
|   |   |-- sajuNabeum.ts
|   |   |-- sajuParse.ts
|   |   |-- sajuRules.ts
|   |   +-- sajuTypes.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- useDstStore.ts
|   |   +-- useSajuSettingsStore.ts
|   |-- save
|   |   |-- index.ts
|   |   +-- useSajuSave.ts
|   |-- saveInterface
|   |   |-- index.ts
|   |   +-- sajuRepo.ts
|   +-- ui
|       |-- etcShinsal
|       |   +-- EtcShinsalColumns.tsx
|       |-- HourPredictionPanel.tsx
|       |-- index.ts
|       |-- LuckCardsPanel.tsx
|       |-- NabeumBadge.tsx
|       |-- PillarCard.tsx
|       |-- SajuCell.tsx
|       |-- SajuChartPage.tsx
|       |-- SajuPillarsPanel.tsx
|       |-- SajuRelationPanels.tsx
|       +-- TodaySajuPage.tsx
|-- settings
|   |-- calc
|   |   |-- index.ts
|   |   |-- sectionOrder.ts
|   |   |-- settingsDerive.ts
|   |   |-- theme.ts
|   |   +-- themeBoot.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- useSettingsDrawerInput.ts
|   |   |-- useSettingsStore.ts
|   |   +-- useTheme.ts
|   |-- save
|   |   |-- bindStoreToUserSettingsKv.ts
|   |   |-- index.ts
|   |   +-- useSettingsDrawerSave.ts
|   |-- saveInterface
|   |   |-- index.ts
|   |   |-- settingsPersistence.ts
|   |   +-- userSettingsKvApi.ts
|   +-- ui
|       |-- index.ts
|       +-- SettingsDrawerPage.tsx
|-- shared
|   |-- activity
|   |   |-- UserActivityHeartbeat.tsx
|   |   +-- UserActivityHeartbeatGate.tsx
|   |-- ads
|   |   |-- AdfitFloatingBar.tsx
|   |   |-- adfitScript.ts
|   |   |-- AdfitScriptManager.tsx
|   |   |-- AdfitSideDock.tsx
|   |   |-- AdfitSlot.tsx
|   |   |-- AdsenseBanner.tsx
|   |   |-- AdsenseFixedSlot.tsx
|   |   |-- adsenseScript.ts
|   |   |-- AdsenseSideDock.tsx
|   |   +-- AdsenseSlot.tsx
|   |-- billing
|   |   |-- entitlements.ts
|   |   +-- usePlanUpgradeCelebration.ts
|   |-- domain
|   |   |-- ganji
|   |   |   |-- common
|   |   |   |   |-- day.ts
|   |   |   |   |-- hour.ts
|   |   |   |   |-- ipchun.ts
|   |   |   |   |-- month.ts
|   |   |   |   |-- utils.ts
|   |   |   |   +-- year.ts
|   |   |   |-- cheongan.ts
|   |   |   |-- common.ts
|   |   |   |-- const.ts
|   |   |   |-- convert.ts
|   |   |   |-- era.ts
|   |   |   |-- ganzhi-utils.ts
|   |   |   |-- jiji.ts
|   |   |   |-- normalize.ts
|   |   |   |-- recalcGanjiSnapshot.ts
|   |   |   |-- twelve.ts
|   |   |   +-- utils.ts
|   |   |-- hidden-stem
|   |   |   |-- const.ts
|   |   |   +-- index.tsx
|   |   +-- solar-terms
|   |       |-- getSolarTerms.ts
|   |       +-- index.ts
|   |-- lib
|   |   |-- calendar
|   |   |   +-- lunar.ts
|   |   |-- core
|   |   |   |-- birthFields.ts
|   |   |   |-- index.ts
|   |   |   +-- timeCorrection.ts
|   |   |-- db
|   |   |   |-- sessionAge.ts
|   |   |   +-- useAppDbSync.ts
|   |   |-- hooks
|   |   |   |-- useAccountStatusStore.ts
|   |   |   |-- useEntitlementsStore.ts
|   |   |   |-- useHourPredictionStore.ts
|   |   |   |-- useLocalStorageState.ts
|   |   |   +-- useSettings.ts
|   |   |-- maintenance
|   |   |   +-- useMaintenanceStore.ts
|   |   |-- plan
|   |   |   |-- access.ts
|   |   |   |-- planCapabilities.ts
|   |   |   +-- planTier.ts
|   |   |-- storage
|   |   |   +-- index.ts
|   |   +-- sessionActivity.ts
|   |-- type
|   |   +-- index.ts
|   |-- ui
|   |   |-- feedback
|   |   |   |-- ConfirmToast.tsx
|   |   |   +-- Toast.tsx
|   |   |-- nav
|   |   |   |-- BottomNav.tsx
|   |   |   +-- TopNav.tsx
|   |   |-- type
|   |   |   +-- useBasicUnlockedCelebration.ts
|   |   |-- BasicUnlockedCelebration.tsx
|   |   |-- FloatingKakaoChatButton.tsx
|   |   |-- InfoAttributionDock.tsx
|   |   +-- PillarCardShared.tsx
|   +-- utils
|       +-- index.ts
|-- sidebar
|   |-- calc
|   |   |-- dndIds.ts
|   |   |-- folderModel.ts
|   |   |-- folderOrder.ts
|   |   |-- index.ts
|   |   |-- sidebarLogic.ts
|   |   |-- useMyeongsikCardCalc.ts
|   |   |-- useSidebarCalc.ts
|   |   +-- useSidebarFolderCalc.ts
|   |-- input
|   |   |-- index.ts
|   |   |-- useMyeongsikCardInput.ts
|   |   |-- useSidebarFolderInput.ts
|   |   +-- useSidebarInput.ts
|   |-- save
|   |   |-- index.ts
|   |   |-- useMyeongsikCardSave.ts
|   |   |-- useSidebarFolderSave.ts
|   |   +-- useSidebarSave.ts
|   |-- saveInterface
|   |   |-- folderEvents.ts
|   |   |-- folderServer.ts
|   |   +-- index.ts
|   +-- ui
|       |-- FolderField.tsx
|       |-- index.ts
|       |-- MyeongsikCard.tsx
|       |-- Sidebar.tsx
|       |-- SidebarFolderBlock.tsx
|       |-- SidebarHeader.tsx
|       |-- SidebarItemDroppable.tsx
|       |-- SidebarNewFolderRow.tsx
|       |-- SidebarSearchBar.tsx
|       +-- SortableItem.tsx
|-- stores
|   +-- sajuStore.ts
|-- env.d.ts
|-- index.d.ts
|-- next-server.d.ts
|-- README.md
+-- vite-env.d.ts
```