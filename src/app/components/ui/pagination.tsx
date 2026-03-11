import * as React from "react";

import { cn } from "@/app/lib/utils";

const Pagination = React.forwardRef<
	HTMLUListElement,
	React.ComponentPropsWithoutRef<"ul">
>(({ className, ...props }, ref) => (
	<ul
		ref={ref}
		className={cn("flex h-10 items-center justify-center space-x-1", className)}
		{...props}
	/>
));
Pagination.displayName = "Pagination";

const PaginationItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
	<li ref={ref} className={cn("h-10 w-10", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

const PaginationLink = React.forwardRef<
	HTMLAnchorElement,
	React.ComponentPropsWithoutRef<"a">
>(({ className, ...props }, ref) => (
	<a
		ref={ref}
		className={cn(
			"flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-primary data-[active]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
			className
		)}
		{...props}
	/>
));
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = React.forwardRef<
	HTMLAnchorElement,
	React.ComponentPropsWithoutRef<"a">
>(({ className, ...props }, ref) => (
	<a
		ref={ref}
		className={cn(
			"flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
			className
		)}
		{...props}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="h-4 w-4"
		>
			<path d="m15 18-6-6 6-6" />
		</svg>
		<span className="sr-only">Previous</span>
	</a>
));
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef<
	HTMLAnchorElement,
	React.ComponentPropsWithoutRef<"a">
>(({ className, ...props }, ref) => (
	<a
		ref={ref}
		className={cn(
			"flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
			className
		)}
		{...props}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="h-4 w-4"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
		<span className="sr-only">Next</span>
	</a>
));
PaginationNext.displayName = "PaginationNext";

const PaginationContent = React.forwardRef<
	HTMLUListElement,
	React.ComponentPropsWithoutRef<"ul">
>(({ className, ...props }, ref) => (
	<ul
		ref={ref}
		className={cn("flex items-center space-x-1", className)}
		{...props}
	/>
));
PaginationContent.displayName = "PaginationContent";

export { Pagination, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationContent };