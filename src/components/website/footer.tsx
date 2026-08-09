import { useSettings } from "@/hooks/use-settings";
import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export function Footer() {
  const { settings } = useSettings('basic');

  const socialLinks = [
    {
      key: 'githubUrl',
      icon: Github,
      label: 'GitHub'
    },
    {
      key: 'twitterUrl',
      icon: Twitter,
      label: 'Twitter'
    }
  ];

  return (
    <footer className="w-full border-t bg-background">
      <div className="mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row justify-between items-center space-y-4">
          {/* 左侧版权信息 */}
          {(
            <div className="text-sm text-muted-foreground order-first md:order-none flex items-center gap-1">
              <img src="/logo.svg" alt="Pintree Logo" className="h-4 w-4" />
              由{' '}
              <Link
                href="https://pintree.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/90 transition-colors"
              >
                Pintree
              </Link>
              {' '}提供支持
            </div>
          )}

          {/* 中间 Powered by 信息 */}

          <div className="text-sm text-muted-foreground text-center md:text-left">
            <span>{settings.copyrightText}</span>
          </div>

          {/* 右侧社交媒体链接 */}
          <div className="flex items-center space-x-4">
            {socialLinks.map(({ key, icon: Icon, label }) =>
              (key === 'contactEmail' ? settings[key] : settings[key]) && (
                <Link
                  key={key}
                  href={key === 'contactEmail' ? `mailto:${settings[key]}` : settings[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
} 