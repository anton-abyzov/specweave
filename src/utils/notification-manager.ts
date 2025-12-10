/**
 * Notification Manager - Cross-platform system notifications
 *
 * Sends native notifications on macOS, Linux, and Windows
 */

import { exec } from 'child_process';
import { Logger, consoleLogger } from './logger.js';

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
   * Sends notification on macOS using osascript
   */
  private async sendMacOSNotification(
    title: string,
    body: string,
    sound?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const soundParam = sound ? ` sound name "${sound}"` : '';
      const script = `display notification "${this.escapeForAppleScript(body)}" with title "${this.escapeForAppleScript(title)}"${soundParam}`;

      exec(`osascript -e '${script}'`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Sends notification on Linux using notify-send
   */
  private async sendLinuxNotification(title: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if notify-send is available
      exec('command -v notify-send', (error) => {
        if (error) {
          this.logger.warn('notify-send not found, skipping notification');
          resolve();
          return;
        }

        exec(`notify-send "${this.escapeForShell(title)}" "${this.escapeForShell(body)}"`, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Sends notification on Windows using PowerShell toast
   */
  private async sendWindowsNotification(title: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
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

      exec(`powershell -Command "${script}"`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
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
}
