/**
 * Smart re-initialization logic
 * Handles the case when .specweave/ already exists
 * Consolidates duplicate logic from init.ts
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import type { ReinitAction } from './types.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { countFilesRecursive } from './path-utils.js';

/**
 * Get translated strings for smart re-initialization
 */
function getSmartReinitStrings(language: SupportedLanguage): {
  detected: string;
  foundFolder: string;
  dangerForce: string;
  dangerWillDelete: string;
  dangerIncrements: string;
  dangerDocs: string;
  dangerConfig: string;
  tipSafeUpdate: string;
  ciProceedingForce: string;
  confirmDelete: string;
  deletionCancelled: string;
  runWithoutForce: string;
  forceModeProceed: string;
  ciContinuing: string;
  whatToDo: string;
  continueWorking: string;
  freshStart: string;
  cancel: string;
  cancelled: string;
  continuingExisting: string;
  keepingAll: string;
  configUpdated: string;
  ciNoForce: string;
  useForceFlag: string;
  warningDelete: string;
  confirmFresh: string;
  freshCancelled: string;
  creatingBackup: string;
  backupSaved: string;
  toRestore: string;
  backupFailed: string;
  removed: string;
  filesDeleted: string;
  startingFresh: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getSmartReinitStrings>> = {
    en: {
      detected: '📦 Existing SpecWeave project detected!',
      foundFolder: 'Found .specweave/ folder with your increments, docs, and configuration.',
      dangerForce: '⛔ DANGER: --force DELETES ALL DATA!',
      dangerWillDelete: 'This will permanently delete:',
      dangerIncrements: '• All increments (.specweave/increments/)',
      dangerDocs: '• All documentation (.specweave/docs/)',
      dangerConfig: '• All configuration and history',
      tipSafeUpdate: '💡 TIP: Use "specweave init ." (no --force) for safe updates',
      ciProceedingForce: 'CI mode: Proceeding with force deletion',
      confirmDelete: '⚠️  Type "y" to PERMANENTLY DELETE all .specweave/ data:',
      deletionCancelled: '✅ Deletion cancelled. No data lost.',
      runWithoutForce: '→ Run "specweave init ." (without --force) for safe updates',
      forceModeProceed: '🔄 Force mode: Proceeding with fresh start...',
      ciContinuing: 'CI mode: Continuing with existing project',
      whatToDo: 'What would you like to do?',
      continueWorking: '✨ Continue working (keep all existing increments, docs, and history)',
      freshStart: '🔄 Fresh start (delete .specweave/ and start from scratch)',
      cancel: '❌ Cancel (exit without changes)',
      cancelled: '⏸️  Initialization cancelled. No changes made.',
      continuingExisting: '✅ Continuing with existing project',
      keepingAll: '→ Keeping all increments, docs, and history',
      configUpdated: '→ Config will be updated if needed',
      ciNoForce: '⛔ ERROR: Cannot start fresh in CI mode without --force flag',
      useForceFlag: '→ Use "specweave init . --force" if you really want to delete all data',
      warningDelete: '⚠️  WARNING: This will DELETE all increments, docs, and configuration!',
      confirmFresh: 'Are you sure you want to start fresh? (all .specweave/ content will be lost)',
      freshCancelled: '⏸️  Fresh start cancelled. No changes made.',
      creatingBackup: '📦 Creating backup before deletion...',
      backupSaved: '✅ Backup saved:',
      toRestore: 'To restore: mv',
      backupFailed: '⚠️  Could not create backup (proceeding anyway)',
      removed: '♻️  Removed .specweave/',
      filesDeleted: 'files deleted',
      startingFresh: '✅ Starting fresh - will create new .specweave/ structure',
    },
    ru: {
      detected: '📦 Обнаружен существующий проект SpecWeave!',
      foundFolder: 'Найдена папка .specweave/ с вашими инкрементами, документами и конфигурацией.',
      dangerForce: '⛔ ОПАСНО: --force УДАЛЯЕТ ВСЕ ДАННЫЕ!',
      dangerWillDelete: 'Это навсегда удалит:',
      dangerIncrements: '• Все инкременты (.specweave/increments/)',
      dangerDocs: '• Всю документацию (.specweave/docs/)',
      dangerConfig: '• Всю конфигурацию и историю',
      tipSafeUpdate: '💡 СОВЕТ: Используйте "specweave init ." (без --force) для безопасного обновления',
      ciProceedingForce: 'CI режим: Продолжаем с принудительным удалением',
      confirmDelete: '⚠️  Введите "y" чтобы НАВСЕГДА УДАЛИТЬ все данные .specweave/:',
      deletionCancelled: '✅ Удаление отменено. Данные сохранены.',
      runWithoutForce: '→ Запустите "specweave init ." (без --force) для безопасного обновления',
      forceModeProceed: '🔄 Принудительный режим: Начинаем с чистого листа...',
      ciContinuing: 'CI режим: Продолжаем с существующим проектом',
      whatToDo: 'Что вы хотите сделать?',
      continueWorking: '✨ Продолжить работу (сохранить все инкременты, документы и историю)',
      freshStart: '🔄 Начать заново (удалить .specweave/ и начать с нуля)',
      cancel: '❌ Отмена (выйти без изменений)',
      cancelled: '⏸️  Инициализация отменена. Изменений не внесено.',
      continuingExisting: '✅ Продолжаем с существующим проектом',
      keepingAll: '→ Сохраняем все инкременты, документы и историю',
      configUpdated: '→ Конфигурация будет обновлена при необходимости',
      ciNoForce: '⛔ ОШИБКА: Невозможно начать заново в CI режиме без флага --force',
      useForceFlag: '→ Используйте "specweave init . --force" если действительно хотите удалить все данные',
      warningDelete: '⚠️  ВНИМАНИЕ: Это УДАЛИТ все инкременты, документы и конфигурацию!',
      confirmFresh: 'Вы уверены, что хотите начать заново? (всё содержимое .specweave/ будет потеряно)',
      freshCancelled: '⏸️  Начало заново отменено. Изменений не внесено.',
      creatingBackup: '📦 Создаём резервную копию перед удалением...',
      backupSaved: '✅ Резервная копия сохранена:',
      toRestore: 'Для восстановления: mv',
      backupFailed: '⚠️  Не удалось создать резервную копию (продолжаем)',
      removed: '♻️  Удалено .specweave/',
      filesDeleted: 'файлов удалено',
      startingFresh: '✅ Начинаем заново - создаём новую структуру .specweave/',
    },
    es: {
      detected: '📦 ¡Proyecto SpecWeave existente detectado!',
      foundFolder: 'Se encontró la carpeta .specweave/ con sus incrementos, documentos y configuración.',
      dangerForce: '⛔ PELIGRO: --force ELIMINA TODOS LOS DATOS!',
      dangerWillDelete: 'Esto eliminará permanentemente:',
      dangerIncrements: '• Todos los incrementos (.specweave/increments/)',
      dangerDocs: '• Toda la documentación (.specweave/docs/)',
      dangerConfig: '• Toda la configuración e historial',
      tipSafeUpdate: '💡 CONSEJO: Use "specweave init ." (sin --force) para actualizaciones seguras',
      ciProceedingForce: 'Modo CI: Procediendo con eliminación forzada',
      confirmDelete: '⚠️  Escriba "y" para ELIMINAR PERMANENTEMENTE todos los datos de .specweave/:',
      deletionCancelled: '✅ Eliminación cancelada. No se perdieron datos.',
      runWithoutForce: '→ Ejecute "specweave init ." (sin --force) para actualizaciones seguras',
      forceModeProceed: '🔄 Modo forzado: Procediendo con inicio limpio...',
      ciContinuing: 'Modo CI: Continuando con proyecto existente',
      whatToDo: '¿Qué le gustaría hacer?',
      continueWorking: '✨ Continuar trabajando (mantener todos los incrementos, documentos e historial)',
      freshStart: '🔄 Empezar de nuevo (eliminar .specweave/ y comenzar desde cero)',
      cancel: '❌ Cancelar (salir sin cambios)',
      cancelled: '⏸️  Inicialización cancelada. No se realizaron cambios.',
      continuingExisting: '✅ Continuando con proyecto existente',
      keepingAll: '→ Manteniendo todos los incrementos, documentos e historial',
      configUpdated: '→ La configuración se actualizará si es necesario',
      ciNoForce: '⛔ ERROR: No se puede empezar de nuevo en modo CI sin el flag --force',
      useForceFlag: '→ Use "specweave init . --force" si realmente quiere eliminar todos los datos',
      warningDelete: '⚠️  ADVERTENCIA: ¡Esto ELIMINARÁ todos los incrementos, documentos y configuración!',
      confirmFresh: '¿Está seguro de que quiere empezar de nuevo? (todo el contenido de .specweave/ se perderá)',
      freshCancelled: '⏸️  Inicio limpio cancelado. No se realizaron cambios.',
      creatingBackup: '📦 Creando respaldo antes de eliminar...',
      backupSaved: '✅ Respaldo guardado:',
      toRestore: 'Para restaurar: mv',
      backupFailed: '⚠️  No se pudo crear respaldo (continuando de todos modos)',
      removed: '♻️  Eliminado .specweave/',
      filesDeleted: 'archivos eliminados',
      startingFresh: '✅ Empezando de nuevo - se creará nueva estructura .specweave/',
    },
    zh: {
      detected: '📦 检测到现有的 SpecWeave 项目！',
      foundFolder: '找到包含增量、文档和配置的 .specweave/ 文件夹。',
      dangerForce: '⛔ 危险：--force 将删除所有数据！',
      dangerWillDelete: '这将永久删除：',
      dangerIncrements: '• 所有增量 (.specweave/increments/)',
      dangerDocs: '• 所有文档 (.specweave/docs/)',
      dangerConfig: '• 所有配置和历史记录',
      tipSafeUpdate: '💡 提示：使用 "specweave init ."（不带 --force）进行安全更新',
      ciProceedingForce: 'CI 模式：继续强制删除',
      confirmDelete: '⚠️  输入 "y" 永久删除所有 .specweave/ 数据：',
      deletionCancelled: '✅ 删除已取消。数据未丢失。',
      runWithoutForce: '→ 运行 "specweave init ."（不带 --force）进行安全更新',
      forceModeProceed: '🔄 强制模式：开始全新安装...',
      ciContinuing: 'CI 模式：继续使用现有项目',
      whatToDo: '您想做什么？',
      continueWorking: '✨ 继续工作（保留所有增量、文档和历史记录）',
      freshStart: '🔄 重新开始（删除 .specweave/ 并从头开始）',
      cancel: '❌ 取消（退出不做更改）',
      cancelled: '⏸️  初始化已取消。未进行任何更改。',
      continuingExisting: '✅ 继续使用现有项目',
      keepingAll: '→ 保留所有增量、文档和历史记录',
      configUpdated: '→ 如需要将更新配置',
      ciNoForce: '⛔ 错误：CI 模式下没有 --force 标志无法重新开始',
      useForceFlag: '→ 如果确实要删除所有数据，请使用 "specweave init . --force"',
      warningDelete: '⚠️  警告：这将删除所有增量、文档和配置！',
      confirmFresh: '确定要重新开始吗？（所有 .specweave/ 内容将丢失）',
      freshCancelled: '⏸️  重新开始已取消。未进行任何更改。',
      creatingBackup: '📦 删除前创建备份...',
      backupSaved: '✅ 备份已保存：',
      toRestore: '恢复方法：mv',
      backupFailed: '⚠️  无法创建备份（继续执行）',
      removed: '♻️  已删除 .specweave/',
      filesDeleted: '个文件已删除',
      startingFresh: '✅ 重新开始 - 将创建新的 .specweave/ 结构',
    },
    de: {
      detected: '📦 Bestehendes SpecWeave-Projekt erkannt!',
      foundFolder: '.specweave/ Ordner mit Ihren Inkrementen, Dokumenten und Konfiguration gefunden.',
      dangerForce: '⛔ GEFAHR: --force LÖSCHT ALLE DATEN!',
      dangerWillDelete: 'Dies wird dauerhaft löschen:',
      dangerIncrements: '• Alle Inkremente (.specweave/increments/)',
      dangerDocs: '• Alle Dokumentation (.specweave/docs/)',
      dangerConfig: '• Alle Konfiguration und Historie',
      tipSafeUpdate: '💡 TIPP: Verwenden Sie "specweave init ." (ohne --force) für sichere Updates',
      ciProceedingForce: 'CI-Modus: Fahre mit erzwungener Löschung fort',
      confirmDelete: '⚠️  Geben Sie "y" ein um ALLE .specweave/ Daten DAUERHAFT ZU LÖSCHEN:',
      deletionCancelled: '✅ Löschung abgebrochen. Keine Daten verloren.',
      runWithoutForce: '→ Führen Sie "specweave init ." (ohne --force) für sichere Updates aus',
      forceModeProceed: '🔄 Erzwungener Modus: Fahre mit Neustart fort...',
      ciContinuing: 'CI-Modus: Fahre mit bestehendem Projekt fort',
      whatToDo: 'Was möchten Sie tun?',
      continueWorking: '✨ Weiterarbeiten (alle Inkremente, Dokumente und Historie behalten)',
      freshStart: '🔄 Neustart (lösche .specweave/ und beginne von vorne)',
      cancel: '❌ Abbrechen (beenden ohne Änderungen)',
      cancelled: '⏸️  Initialisierung abgebrochen. Keine Änderungen vorgenommen.',
      continuingExisting: '✅ Fahre mit bestehendem Projekt fort',
      keepingAll: '→ Behalte alle Inkremente, Dokumente und Historie',
      configUpdated: '→ Konfiguration wird bei Bedarf aktualisiert',
      ciNoForce: '⛔ FEHLER: Neustart im CI-Modus ohne --force Flag nicht möglich',
      useForceFlag: '→ Verwenden Sie "specweave init . --force" wenn Sie wirklich alle Daten löschen wollen',
      warningDelete: '⚠️  WARNUNG: Dies wird ALLE Inkremente, Dokumente und Konfiguration LÖSCHEN!',
      confirmFresh: 'Sind Sie sicher, dass Sie neu starten wollen? (alle .specweave/ Inhalte gehen verloren)',
      freshCancelled: '⏸️  Neustart abgebrochen. Keine Änderungen vorgenommen.',
      creatingBackup: '📦 Erstelle Backup vor dem Löschen...',
      backupSaved: '✅ Backup gespeichert:',
      toRestore: 'Zum Wiederherstellen: mv',
      backupFailed: '⚠️  Konnte kein Backup erstellen (fahre trotzdem fort)',
      removed: '♻️  .specweave/ entfernt',
      filesDeleted: 'Dateien gelöscht',
      startingFresh: '✅ Starte neu - erstelle neue .specweave/ Struktur',
    },
    fr: {
      detected: '📦 Projet SpecWeave existant détecté !',
      foundFolder: 'Dossier .specweave/ trouvé avec vos incréments, documents et configuration.',
      dangerForce: '⛔ DANGER : --force SUPPRIME TOUTES LES DONNÉES !',
      dangerWillDelete: 'Ceci supprimera définitivement :',
      dangerIncrements: '• Tous les incréments (.specweave/increments/)',
      dangerDocs: '• Toute la documentation (.specweave/docs/)',
      dangerConfig: '• Toute la configuration et l\'historique',
      tipSafeUpdate: '💡 CONSEIL : Utilisez "specweave init ." (sans --force) pour des mises à jour sécurisées',
      ciProceedingForce: 'Mode CI : Procède à la suppression forcée',
      confirmDelete: '⚠️  Tapez "y" pour SUPPRIMER DÉFINITIVEMENT toutes les données .specweave/ :',
      deletionCancelled: '✅ Suppression annulée. Aucune donnée perdue.',
      runWithoutForce: '→ Exécutez "specweave init ." (sans --force) pour des mises à jour sécurisées',
      forceModeProceed: '🔄 Mode forcé : Procède au démarrage propre...',
      ciContinuing: 'Mode CI : Continue avec le projet existant',
      whatToDo: 'Que souhaitez-vous faire ?',
      continueWorking: '✨ Continuer à travailler (garder tous les incréments, documents et historique)',
      freshStart: '🔄 Recommencer (supprimer .specweave/ et repartir de zéro)',
      cancel: '❌ Annuler (quitter sans changements)',
      cancelled: '⏸️  Initialisation annulée. Aucun changement effectué.',
      continuingExisting: '✅ Continue avec le projet existant',
      keepingAll: '→ Conservation de tous les incréments, documents et historique',
      configUpdated: '→ La configuration sera mise à jour si nécessaire',
      ciNoForce: '⛔ ERREUR : Impossible de recommencer en mode CI sans le flag --force',
      useForceFlag: '→ Utilisez "specweave init . --force" si vous voulez vraiment supprimer toutes les données',
      warningDelete: '⚠️  ATTENTION : Ceci SUPPRIMERA tous les incréments, documents et configuration !',
      confirmFresh: 'Êtes-vous sûr de vouloir recommencer ? (tout le contenu de .specweave/ sera perdu)',
      freshCancelled: '⏸️  Redémarrage annulé. Aucun changement effectué.',
      creatingBackup: '📦 Création d\'une sauvegarde avant suppression...',
      backupSaved: '✅ Sauvegarde enregistrée :',
      toRestore: 'Pour restaurer : mv',
      backupFailed: '⚠️  Impossible de créer une sauvegarde (continuation quand même)',
      removed: '♻️  .specweave/ supprimé',
      filesDeleted: 'fichiers supprimés',
      startingFresh: '✅ Recommence - création d\'une nouvelle structure .specweave/',
    },
    ja: {
      detected: '📦 既存のSpecWeaveプロジェクトが検出されました！',
      foundFolder: 'インクリメント、ドキュメント、設定を含む.specweave/フォルダが見つかりました。',
      dangerForce: '⛔ 危険：--forceはすべてのデータを削除します！',
      dangerWillDelete: 'これにより永久に削除されます：',
      dangerIncrements: '• すべてのインクリメント (.specweave/increments/)',
      dangerDocs: '• すべてのドキュメント (.specweave/docs/)',
      dangerConfig: '• すべての設定と履歴',
      tipSafeUpdate: '💡 ヒント：安全な更新には "specweave init ."（--forceなし）を使用してください',
      ciProceedingForce: 'CIモード：強制削除を続行します',
      confirmDelete: '⚠️  "y" を入力してすべての.specweave/データを永久に削除：',
      deletionCancelled: '✅ 削除がキャンセルされました。データは失われていません。',
      runWithoutForce: '→ 安全な更新には "specweave init ."（--forceなし）を実行してください',
      forceModeProceed: '🔄 強制モード：クリーンスタートを続行中...',
      ciContinuing: 'CIモード：既存のプロジェクトを続行します',
      whatToDo: '何をしますか？',
      continueWorking: '✨ 作業を続ける（すべてのインクリメント、ドキュメント、履歴を保持）',
      freshStart: '🔄 最初から始める（.specweave/を削除してゼロから開始）',
      cancel: '❌ キャンセル（変更なしで終了）',
      cancelled: '⏸️  初期化がキャンセルされました。変更は行われていません。',
      continuingExisting: '✅ 既存のプロジェクトを続行します',
      keepingAll: '→ すべてのインクリメント、ドキュメント、履歴を保持します',
      configUpdated: '→ 必要に応じて設定が更新されます',
      ciNoForce: '⛔ エラー：--forceフラグなしでCIモードでは最初から始められません',
      useForceFlag: '→ 本当にすべてのデータを削除したい場合は "specweave init . --force" を使用してください',
      warningDelete: '⚠️  警告：これによりすべてのインクリメント、ドキュメント、設定が削除されます！',
      confirmFresh: '本当に最初から始めますか？（すべての.specweave/の内容が失われます）',
      freshCancelled: '⏸️  クリーンスタートがキャンセルされました。変更は行われていません。',
      creatingBackup: '📦 削除前にバックアップを作成中...',
      backupSaved: '✅ バックアップが保存されました：',
      toRestore: '復元するには：mv',
      backupFailed: '⚠️  バックアップを作成できませんでした（続行します）',
      removed: '♻️  .specweave/が削除されました',
      filesDeleted: 'ファイルが削除されました',
      startingFresh: '✅ 最初から始めます - 新しい.specweave/構造を作成します',
    },
    ko: {
      detected: '📦 기존 SpecWeave 프로젝트가 감지되었습니다!',
      foundFolder: '증분, 문서 및 구성이 포함된 .specweave/ 폴더를 찾았습니다.',
      dangerForce: '⛔ 위험: --force는 모든 데이터를 삭제합니다!',
      dangerWillDelete: '다음이 영구적으로 삭제됩니다:',
      dangerIncrements: '• 모든 증분 (.specweave/increments/)',
      dangerDocs: '• 모든 문서 (.specweave/docs/)',
      dangerConfig: '• 모든 구성 및 기록',
      tipSafeUpdate: '💡 팁: 안전한 업데이트를 위해 "specweave init ." (--force 없이)를 사용하세요',
      ciProceedingForce: 'CI 모드: 강제 삭제를 진행합니다',
      confirmDelete: '⚠️  모든 .specweave/ 데이터를 영구적으로 삭제하려면 "y"를 입력하세요:',
      deletionCancelled: '✅ 삭제가 취소되었습니다. 데이터가 손실되지 않았습니다.',
      runWithoutForce: '→ 안전한 업데이트를 위해 "specweave init ." (--force 없이)를 실행하세요',
      forceModeProceed: '🔄 강제 모드: 새로 시작을 진행합니다...',
      ciContinuing: 'CI 모드: 기존 프로젝트를 계속합니다',
      whatToDo: '무엇을 하시겠습니까?',
      continueWorking: '✨ 계속 작업 (모든 증분, 문서 및 기록 유지)',
      freshStart: '🔄 새로 시작 (.specweave/를 삭제하고 처음부터 시작)',
      cancel: '❌ 취소 (변경 없이 종료)',
      cancelled: '⏸️  초기화가 취소되었습니다. 변경 사항이 없습니다.',
      continuingExisting: '✅ 기존 프로젝트를 계속합니다',
      keepingAll: '→ 모든 증분, 문서 및 기록을 유지합니다',
      configUpdated: '→ 필요시 구성이 업데이트됩니다',
      ciNoForce: '⛔ 오류: --force 플래그 없이 CI 모드에서 새로 시작할 수 없습니다',
      useForceFlag: '→ 정말로 모든 데이터를 삭제하려면 "specweave init . --force"를 사용하세요',
      warningDelete: '⚠️  경고: 이것은 모든 증분, 문서 및 구성을 삭제합니다!',
      confirmFresh: '정말로 새로 시작하시겠습니까? (모든 .specweave/ 내용이 손실됩니다)',
      freshCancelled: '⏸️  새로 시작이 취소되었습니다. 변경 사항이 없습니다.',
      creatingBackup: '📦 삭제 전 백업 생성 중...',
      backupSaved: '✅ 백업이 저장되었습니다:',
      toRestore: '복원하려면: mv',
      backupFailed: '⚠️  백업을 생성할 수 없습니다 (계속 진행합니다)',
      removed: '♻️  .specweave/가 제거되었습니다',
      filesDeleted: '파일이 삭제되었습니다',
      startingFresh: '✅ 새로 시작 - 새 .specweave/ 구조를 생성합니다',
    },
    pt: {
      detected: '📦 Projeto SpecWeave existente detectado!',
      foundFolder: 'Pasta .specweave/ encontrada com seus incrementos, documentos e configuração.',
      dangerForce: '⛔ PERIGO: --force APAGA TODOS OS DADOS!',
      dangerWillDelete: 'Isto irá excluir permanentemente:',
      dangerIncrements: '• Todos os incrementos (.specweave/increments/)',
      dangerDocs: '• Toda a documentação (.specweave/docs/)',
      dangerConfig: '• Toda a configuração e histórico',
      tipSafeUpdate: '💡 DICA: Use "specweave init ." (sem --force) para atualizações seguras',
      ciProceedingForce: 'Modo CI: Prosseguindo com exclusão forçada',
      confirmDelete: '⚠️  Digite "y" para EXCLUIR PERMANENTEMENTE todos os dados de .specweave/:',
      deletionCancelled: '✅ Exclusão cancelada. Nenhum dado perdido.',
      runWithoutForce: '→ Execute "specweave init ." (sem --force) para atualizações seguras',
      forceModeProceed: '🔄 Modo forçado: Prosseguindo com início limpo...',
      ciContinuing: 'Modo CI: Continuando com projeto existente',
      whatToDo: 'O que você gostaria de fazer?',
      continueWorking: '✨ Continuar trabalhando (manter todos os incrementos, documentos e histórico)',
      freshStart: '🔄 Começar do zero (excluir .specweave/ e começar do início)',
      cancel: '❌ Cancelar (sair sem alterações)',
      cancelled: '⏸️  Inicialização cancelada. Nenhuma alteração feita.',
      continuingExisting: '✅ Continuando com projeto existente',
      keepingAll: '→ Mantendo todos os incrementos, documentos e histórico',
      configUpdated: '→ A configuração será atualizada se necessário',
      ciNoForce: '⛔ ERRO: Não é possível começar do zero no modo CI sem a flag --force',
      useForceFlag: '→ Use "specweave init . --force" se realmente quiser excluir todos os dados',
      warningDelete: '⚠️  AVISO: Isto EXCLUIRÁ todos os incrementos, documentos e configuração!',
      confirmFresh: 'Tem certeza de que deseja começar do zero? (todo o conteúdo de .specweave/ será perdido)',
      freshCancelled: '⏸️  Início limpo cancelado. Nenhuma alteração feita.',
      creatingBackup: '📦 Criando backup antes da exclusão...',
      backupSaved: '✅ Backup salvo:',
      toRestore: 'Para restaurar: mv',
      backupFailed: '⚠️  Não foi possível criar backup (prosseguindo mesmo assim)',
      removed: '♻️  .specweave/ removido',
      filesDeleted: 'arquivos excluídos',
      startingFresh: '✅ Começando do zero - criará nova estrutura .specweave/',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Options for smart re-initialization prompt
 */
export interface SmartReinitOptions {
  targetDir: string;
  isCI: boolean;
  hasForce: boolean;
  language?: SupportedLanguage;
}

/**
 * Result of smart re-initialization
 */
export interface SmartReinitResult {
  action: ReinitAction;
  continueExisting: boolean;
}

/**
 * Prompt user for re-initialization action when .specweave/ already exists
 * This consolidates the duplicate logic that appeared twice in init.ts
 *
 * @param options - Configuration options
 * @returns The chosen action and whether to continue with existing project
 */
export async function promptSmartReinit(options: SmartReinitOptions): Promise<SmartReinitResult> {
  const { targetDir, isCI, hasForce, language = 'en' } = options;
  const strings = getSmartReinitStrings(language);

  console.log(chalk.blue('\n' + strings.detected));
  console.log(chalk.gray('   ' + strings.foundFolder + '\n'));

  let action: ReinitAction;

  if (hasForce) {
    // Force mode: warn about destructive action
    console.log(chalk.red.bold('\n' + strings.dangerForce));
    console.log(chalk.red('   ' + strings.dangerWillDelete));
    console.log(chalk.red('   ' + strings.dangerIncrements));
    console.log(chalk.red('   ' + strings.dangerDocs));
    console.log(chalk.red('   ' + strings.dangerConfig));
    console.log(chalk.yellow('\n   ' + strings.tipSafeUpdate + '\n'));

    if (isCI) {
      // CI mode: proceed with force deletion without prompting
      console.log(chalk.gray('   → ' + strings.ciProceedingForce));
      action = 'fresh';
    } else {
      // Interactive: require explicit confirmation
      const confirmDeletion = await confirm({
        message: chalk.red(strings.confirmDelete),
        default: false,
      });

      if (!confirmDeletion) {
        console.log(chalk.green('\n' + strings.deletionCancelled));
        console.log(chalk.gray('   ' + strings.runWithoutForce));
        return { action: 'cancel', continueExisting: false };
      }

      action = 'fresh';
    }
    console.log(chalk.yellow('\n   ' + strings.forceModeProceed));
  } else if (isCI) {
    // CI mode without force: auto-continue
    console.log(chalk.gray('   → ' + strings.ciContinuing));
    action = 'continue';
  } else {
    // Interactive mode: show choices
    action = await select({
      message: strings.whatToDo,
      choices: [
        {
          name: strings.continueWorking,
          value: 'continue' as const,
        },
        {
          name: strings.freshStart,
          value: 'fresh' as const,
        },
        {
          name: strings.cancel,
          value: 'cancel' as const,
        }
      ],
      default: 'continue'
    });
  }

  if (action === 'cancel') {
    console.log(chalk.yellow('\n' + strings.cancelled));
    return { action: 'cancel', continueExisting: false };
  }

  if (action === 'fresh') {
    // Handle fresh start
    const freshResult = await handleFreshStart(targetDir, isCI, hasForce, language);
    return { action: freshResult ? 'fresh' : 'cancel', continueExisting: false };
  }

  // Continue working
  console.log(chalk.green('\n' + strings.continuingExisting));
  console.log(chalk.gray('   ' + strings.keepingAll));
  console.log(chalk.gray('   ' + strings.configUpdated + '\n'));
  return { action: 'continue', continueExisting: true };
}

/**
 * Handle fresh start action - backup and delete .specweave/
 *
 * @param targetDir - Target directory
 * @param isCI - Whether running in CI mode
 * @param hasForce - Whether --force flag was used
 * @param language - Language for translations
 * @returns true if fresh start succeeded, false if cancelled
 */
async function handleFreshStart(
  targetDir: string,
  isCI: boolean,
  hasForce: boolean,
  language: SupportedLanguage = 'en'
): Promise<boolean> {
  const strings = getSmartReinitStrings(language);
  const specweavePath = path.join(targetDir, '.specweave');

  if (!hasForce) {
    if (isCI) {
      // CI mode without force: NEVER allow fresh start
      console.log(chalk.red('\n' + strings.ciNoForce));
      console.log(chalk.gray('   ' + strings.useForceFlag));
      return false;
    }

    // Interactive: ask for confirmation
    console.log(chalk.yellow('\n' + strings.warningDelete));
    const confirmFresh = await confirm({
      message: strings.confirmFresh,
      default: false,
    });

    if (!confirmFresh) {
      console.log(chalk.yellow('\n' + strings.freshCancelled));
      return false;
    }
  }

  // Create backup before deletion
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = path.join(targetDir, `.specweave.backup-${timestamp}`);

  try {
    console.log(chalk.cyan('\n   ' + strings.creatingBackup));
    fs.copySync(specweavePath, backupPath);
    console.log(chalk.green(`   ${strings.backupSaved} ${path.relative(targetDir, backupPath)}`));
    console.log(chalk.gray(`      ${strings.toRestore} ${path.basename(backupPath)} .specweave`));
  } catch {
    console.log(chalk.yellow('   ' + strings.backupFailed));
  }

  // Count files before deletion
  const fileCount = countFilesRecursive(specweavePath);

  // Delete .specweave/
  fs.removeSync(specweavePath);
  console.log(chalk.blue(`\n   ${strings.removed} (${fileCount} ${strings.filesDeleted})`));
  console.log(chalk.green('   ' + strings.startingFresh + '\n'));

  return true;
}
