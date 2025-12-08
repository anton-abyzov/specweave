/**
 * Wizard Navigation - Shared Constants and Types for Init Wizard
 *
 * Provides "go back" navigation support across all init wizard steps.
 * Each prompt can return WIZARD_BACK to signal the user wants to go back.
 */

import chalk from 'chalk';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Symbol indicating user wants to go back to previous step
 */
export const WIZARD_BACK = Symbol('WIZARD_BACK');

/**
 * Type for wizard step results that support going back
 */
export type WizardResult<T> = T | typeof WIZARD_BACK;

/**
 * Check if result is a go-back signal
 */
export function isGoBack<T>(result: WizardResult<T>): result is typeof WIZARD_BACK {
  return result === WIZARD_BACK;
}

/**
 * Translations for go-back option
 */
interface GoBackStrings {
  goBack: string;
  yes: string;
  no: string;
  goingBack: string;
}

const GO_BACK_STRINGS: Record<SupportedLanguage, GoBackStrings> = {
  en: {
    goBack: '← Go back to previous step',
    yes: 'Yes',
    no: 'No',
    goingBack: '← Going back to previous step...',
  },
  ru: {
    goBack: '← Вернуться к предыдущему шагу',
    yes: 'Да',
    no: 'Нет',
    goingBack: '← Возврат к предыдущему шагу...',
  },
  es: {
    goBack: '← Volver al paso anterior',
    yes: 'Sí',
    no: 'No',
    goingBack: '← Volviendo al paso anterior...',
  },
  zh: {
    goBack: '← 返回上一步',
    yes: '是',
    no: '否',
    goingBack: '← 正在返回上一步...',
  },
  de: {
    goBack: '← Zurück zum vorherigen Schritt',
    yes: 'Ja',
    no: 'Nein',
    goingBack: '← Zurück zum vorherigen Schritt...',
  },
  fr: {
    goBack: '← Revenir à l\'étape précédente',
    yes: 'Oui',
    no: 'Non',
    goingBack: '← Retour à l\'étape précédente...',
  },
  ja: {
    goBack: '← 前のステップに戻る',
    yes: 'はい',
    no: 'いいえ',
    goingBack: '← 前のステップに戻ります...',
  },
  ko: {
    goBack: '← 이전 단계로 돌아가기',
    yes: '예',
    no: '아니오',
    goingBack: '← 이전 단계로 돌아가는 중...',
  },
  pt: {
    goBack: '← Voltar ao passo anterior',
    yes: 'Sim',
    no: 'Não',
    goingBack: '← Voltando ao passo anterior...',
  },
};

/**
 * Get go-back strings for a language
 */
export function getGoBackStrings(language: SupportedLanguage): GoBackStrings {
  return GO_BACK_STRINGS[language] || GO_BACK_STRINGS.en;
}

/**
 * Create a "go back" choice for select prompts
 */
export function createGoBackChoice(language: SupportedLanguage = 'en'): {
  value: 'back';
  name: string;
} {
  const strings = getGoBackStrings(language);
  return {
    value: 'back' as const,
    name: chalk.gray(strings.goBack),
  };
}

/**
 * Log "going back" message
 */
export function logGoingBack(language: SupportedLanguage = 'en'): void {
  const strings = getGoBackStrings(language);
  console.log(chalk.gray(`\n  ${strings.goingBack}\n`));
}
