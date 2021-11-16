import { writable } from 'svelte/store';
export const videoPlayers = [];

// TODO: Current logged in user (have no auth* yet)
export const user = writable({
	id			: null,
	username	: null,

	first_name	: null,
	last_name	: null,
	email		: null,

	access		: { },
	accessToken	: null,
	expires     : null,
	admin		: false,
	enabled		: true,
});
