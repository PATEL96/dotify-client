import { ThemeToggleButton } from "./toggleTheme";

export default function Navbar() {
	return (
		<div className="h-[10svh] text-2xl font-bold flex items-center justify-between sticky top-0 w-full bg-[#fffff66] z-10 backdrop-blur-sm ">
			<div className="drop-shadow-sm m-3">
				Dotify
			</div>
			<div className="m-3">
				<ThemeToggleButton />
			</div>
		</div>
	);
}