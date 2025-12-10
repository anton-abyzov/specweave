/**
 * Notification Manager - Cross-platform system notifications
 *
 * Sends native notifications on macOS, Linux, and Windows
 *
 * IMPORTANT: Use sendStandardNotification() for consistent, explicit notifications!
 * See notification-constants.ts for the standard notification types and messages.
 */

import { exec } from 'child_process';
import { Logger, consoleLogger } from './logger.js';
import {
  NotificationType,
  NotificationContext,
  buildNotificationMessage,
  getTitleForType,
  getSoundForType,
} from './notification-constants.js';

export class NotificationManager {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Sends a system notification (cross-platform)
   *
   * @param title - Notification title
   * @param body - Notification message
   * @param sound - Optional sound name (macOS only)
   */
  async sendNotification(title: string, body: string, sound?: string): Promise<void> {
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        await this.sendMacOSNotification(title, body, sound);
      } else if (platform === 'linux') {
        await this.sendLinuxNotification(title, body);
      } else if (platform === 'win32') {
        await this.sendWindowsNotification(title, body);
      } else {
        this.logger.warn(`Notifications not supported on platform: ${platform}`);
        this.logger.info(`[Notification] ${title}: ${body}`);
      }
    } catch (err) {
      this.logger.error('Failed to send notification:', err);
      // Fallback to console
      this.logger.info(`[Notification] ${title}: ${body}`);
    }
  }

  /**
   * Sends notification on macOS using osascript (NON-BLOCKING)
   *
   * CRITICAL: Fire-and-forget pattern to prevent blocking Claude Code!
   * Notifications are informational only and should NEVER block execution.
   */
  private async sendMacOSNotification(
    title: string,
    body: string,
    sound?: string
  ): Promise<void> {
    const soundParam = sound ? ` sound name "${sound}"` : '';
    const script = `display notification "${this.escapeForAppleScript(body)}" with title "${this.escapeForAppleScript(title)}"${soundParam}`;

    // Fire-and-forget: DON'T wait for completion!
    exec(`osascript -e '${script}'`, (error) => {
      if (error) {
        this.logger.debug(`Notification failed (non-critical): ${error.message}`);
      }
    });

    // Resolve immediately without waiting
    return Promise.resolve();
  }

  /**
   * Sends notification on Linux using notify-send (NON-BLOCKING)
   *
   * CRITICAL: Fire-and-forget pattern to prevent blocking Claude Code!
   * Notifications are informational only and should NEVER block execution.
   */
  private async sendLinuxNotification(title: string, body: string): Promise<void> {
    // Fire-and-forget: DON'T wait for completion!
    exec('command -v notify-send', (error) => {
      if (error) {
        this.logger.debug('notify-send not available, skipping notification');
        return;
      }

      // Fire-and-forget: nested exec also non-blocking
      exec(`notify-send "${this.escapeForShell(title)}" "${this.escapeForShell(body)}" --urgency=normal`, (error) => {
        if (error) {
          this.logger.debug(`Notification failed (non-critical): ${error.message}`);
        }
      });
    });

    // Resolve immediately without waiting
    return Promise.resolve();
  }

  /**
   * Sends notification on Windows using PowerShell toast (NON-BLOCKING)
   *
   * CRITICAL: Fire-and-forget pattern to prevent blocking Claude Code!
   * Notifications are informational only and should NEVER block execution.
   */
  private async sendWindowsNotification(title: string, body: string): Promise<void> {
    const script = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

      $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
      $toastXml = [xml] $template.GetXml()
      $toastXml.GetElementsByTagName("text")[0].AppendChild($toastXml.CreateTextNode("${this.escapeForPowerShell(title)}")) | Out-Null
      $toastXml.GetElementsByTagName("text")[1].AppendChild($toastXml.CreateTextNode("${this.escapeForPowerShell(body)}")) | Out-Null

      $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
      $xml.LoadXml($toastXml.OuterXml)
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("SpecWeave").Show($toast)
    `;

    // Fire-and-forget: DON'T wait for completion!
    exec(`powershell -Command "${script}"`, (error) => {
      if (error) {
        this.logger.debug(`Notification failed (non-critical): ${error.message}`);
      }
    });

    // Resolve immediately without waiting
    return Promise.resolve();
  }

  /**
   * Escapes string for AppleScript
   */
  private escapeForAppleScript(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
  }

  /**
   * Escapes string for shell
   */
  private escapeForShell(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  }

  /**
   * Escapes string for PowerShell
   */
  private escapeForPowerShell(str: string): string {
    return str.replace(/"/g, '`"').replace(/\$/g, '`$');
  }

  /**
   * Sends a standardized notification using the notification-constants module.
   *
   * PREFERRED METHOD - ensures consistent, explicit notifications that follow
   * the WHO/WHAT/ACTION pattern documented in CLAUDE.md Rule 11.
   *
   * @param type - Notification type (cleanup, job_complete, error, etc.)
   * @param context - Context for message interpolation (count, items, reason, etc.)
   *
   * @example
   * // Send cleanup completion notification
   * await manager.sendStandardNotification('cleanup', { count: 5 });
   * // Result: "SpecWeave: Cleanup Done" - "Cleaned up 5 zombie processes. No action needed."
   *
   * @example
   * // Send job completion notification
   * await manager.sendStandardNotification('job_complete', { jobType: 'Import', items: 12 });
   * // Result: "SpecWeave: Job Complete" - "Import job finished. Processed 12 items."
   */
  async sendStandardNotification(
    type: NotificationType,
    context: NotificationContext = {}
  ): Promise<void> {
    const title = getTitleForType(type);
    const body = buildNotificationMessage(type, context);
    const sound = getSoundForType(type);

    return this.sendNotification(title, body, sound);
  }
}
