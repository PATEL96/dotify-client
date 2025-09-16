"use client";
import { ThemeToggleButton } from "./toggleTheme";
import GitHubButton from "react-github-btn";
import { Github, Heart, Star } from "lucide-react";

export default function Navbar() {
    return (
        <div className="h-[10svh] text-2xl font-bold flex items-center justify-between sticky top-0 w-full bg-[#fffff66] z-10 backdrop-blur-xs ">
            <div className="drop-shadow-xs m-3 cursor-default flex items-center justify-start gap-5 text-center">
                DOTIFY
            </div>
            <div className="m-3 flex items-center justify-evenly gap-5">
                {/* Desktop GitHub buttons */}
                <div className="md:flex items-center justify-evenly gap-6 hidden">
                    <div>
                        <GitHubButton
                            href="https://github.com/PATEL96"
                            data-color-scheme="no-preference: dark; light: dark; dark: dark;"
                            data-size="large"
                            data-show-count="true"
                            aria-label="Follow @PATEL96 on GitHub"
                        >
                            Follow @PATEL96
                        </GitHubButton>
                    </div>
                    <div>
                        <GitHubButton
                            href="https://github.com/PATEL96/dotify-client"
                            data-color-scheme="no-preference: dark; light: dark; dark: dark;"
                            data-size="large"
                            data-show-count="true"
                            aria-label="Star PATEL96/dotify-client on GitHub"
                        >
                            Star
                        </GitHubButton>
                    </div>
                    <div>
                        <GitHubButton
                            href="https://github.com/sponsors/PATEL96"
                            data-color-scheme="no-preference: dark; light: dark; dark: dark;"
                            data-icon="octicon-heart"
                            data-size="large"
                            aria-label="Sponsor @PATEL96 on GitHub"
                        >
                            Sponsor
                        </GitHubButton>
                    </div>
                </div>

                {/* Mobile GitHub icons */}
                <div className="flex md:hidden items-center gap-4">
                    <a
                        href="https://github.com/PATEL96"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Follow @PATEL96 on GitHub"
                    >
                        <Github
                            size={24}
                            className="text-neutral-300 transition-colors"
                        />
                    </a>
                    <a
                        href="https://github.com/PATEL96/dotify-client"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Star PATEL96/dotify-client on GitHub"
                    >
                        <Star
                            size={24}
                            className="text-yellow-500 transition-colors"
                        />
                    </a>
                    <a
                        href="https://github.com/sponsors/PATEL96"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Sponsor @PATEL96 on GitHub"
                    >
                        <Heart
                            size={24}
                            className="text-pink-500 transition-colors"
                        />
                    </a>
                </div>

                <ThemeToggleButton />
            </div>
        </div>
    );
}
