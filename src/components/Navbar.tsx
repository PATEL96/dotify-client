'use client'
import { ThemeToggleButton } from "./toggleTheme";
import GitHubButton from 'react-github-btn'

export default function Navbar() {
	return (
		<div className="h-[10svh] text-2xl font-bold flex items-center justify-between sticky top-0 w-full bg-[#fffff66] z-10 backdrop-blur-sm ">
			<div className="drop-shadow-sm m-3 cursor-default flex items-center justify-start gap-5 text-center">
				DOTIFY
			</div>
			<div className="m-3 flex items-center justify-evenly gap-5">
				<div>
					<GitHubButton href="https://github.com/PATEL96" data-color-scheme="no-preference: dark; light: dark; dark: dark;" data-size="large" data-show-count="true" aria-label="Follow @PATEL96 on GitHub">Follow @PATEL96</GitHubButton>
				</div>
				<div>
					<GitHubButton href="https://github.com/PATEL96/dotify-client" data-color-scheme="no-preference: dark; light: dark; dark: dark;" data-size="large" data-show-count="true" aria-label="Star PATEL96/dotify-client on GitHub">Star</GitHubButton>
				</div>
				<div>
					<GitHubButton href="https://github.com/sponsors/PATEL96" data-color-scheme="no-preference: dark; light: dark; dark: dark;" data-icon="octicon-heart" data-size="large" aria-label="Sponsor @PATEL96 on GitHub">Sponsor</GitHubButton>
				</div>
				<ThemeToggleButton />
			</div>
		</div>
	);
}