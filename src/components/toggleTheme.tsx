'use client'
// components/ThemeToggle.tsx
import { SunIcon, MoonIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ThemeToggleButton = () => {
	const [theme, setTheme] = useState<'light' | 'dark'>('dark');

	useEffect(() => {
		const storedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
			document.documentElement.classList.add('dark');
			setTheme('dark');
		} else {
			document.documentElement.classList.remove('dark');
			setTheme('light');
		}
	}, []);

	const toggleTheme = () => {
		if (theme === 'dark') {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		} else {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		}
		// Force a page refresh
		window.location.reload();
	};

	return (
		<button onClick={toggleTheme}>
			{theme === 'light' ? <MoonIcon /> : <SunIcon />}
		</button>
	);
};