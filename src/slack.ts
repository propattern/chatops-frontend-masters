import fetch from "node-fetch";
import type { Handler } from '@netlify/functions';

import {parse} from 'querystring'
import { blocks, getUsernames, modal, slackApi, verifySlackRequest } from './util/slack';

const  handleSlashCommand= async (payload: SlackSlashCommandPayload) => {
	switch(payload.command) {
		case '/foodfight':
			const response = await slackApi('views.open', 
			modal({
					id: 'foodfight-modal',
					title: 'Start a food fight',
					trigger_id: payload.trigger_id,
					blocks: [
						blocks.section({
							text: 'Experimentation Feedback"'
						}),
						blocks.radios({
							id: 'spice_level',
							label: 'How satisfied are you with the support you receive from the team?',
							placeholder: 'Select a spice level',
							options: [
								{label: '1  Not at all satisfied', value: '1'},
								{label: '2', value: '2'},
								{label: '3', value: '3'},
								{label: '4', value: '4'},
								{label: '5 = Very satisfied', value: '5'},
							]
						}),
						blocks.input({
							id: 'opinion',
							label: 'Please tell us why you answered the way you did',
							placeholder: 'It steered us towards success',
							initial_value: payload.text ?? '',
							hint: 'Your comments will help us improve our process'
						}),
					]
				})
			)

			if (!response.ok) {
				console.log('Error', response)
			}

			break;
		
		default:
			return {
				statusCode: 200,
				body: `command ${payload.command} is not recognized`
			}
	}

	return {
		statusCode: 200,
		body: ''
	}
}

const handleInteractivity = async (payload:SlackModalPayload) => {
	const callback_id = payload.callback_id ?? payload.view.callback_id;

	switch(callback_id) {

		case 'foodfight-modal':
			const data = payload.view.state.values;
			const fields = {
				opinions: data.opinion_block.opinion.value,
				spiceLevel: data.spice_level_block.spice_level.selected_option.value,
				submitter: payload.user.id,
				submitterName: payload.user.name
			}
			console.log(fields);
			await slackApi('chat.postMessage', {
				channel: 'C05SC31JZ0Q',
				text: `oh dang, ya'll  <@${fields.submitter}>`
			})

			break;

			default:
				console.log('No handler defined for', callback_id)
				return {
					statusCode: 400,
					body: `No Handler found for ${callback_id}`
				}
	}

	return {
		statusCode: 200,
		body: ''
	} 
}

const handleTextCommand = async (body:SlackSlashCommandPayload) => {
	const { text } = body as SlackSlashCommandPayload
	const usernames = getUsernames(text);
	const channel = usernames[0]

	await slackApi('chat.postMessage', {
		channel: channel,
		text: `oh dang, ya'll`
	})
	return {
		statusCode: 200,
		body: ''
	} 
}

export const handler: Handler = async (event) => {
	const valid = verifySlackRequest(event);
	if (!valid) {
		console.log('invalid request')

		return {
			statusCode: 400,
			body: 'invalid request'
		}
	}

	// TODO handle slash commands
	const body = parse(event.body ?? '') as SlackPayload;
	const { text } = body as SlackSlashCommandPayload

	if (text) {
		return handleTextCommand(body as SlackSlashCommandPayload);
	}

	if (body.command) {
		return handleSlashCommand(body as SlackSlashCommandPayload);
	}

	

	const payload = JSON.parse(body.payload)
	// TODO handle interactivity (e.g. context commands, modals)
	if (payload) {
		return handleInteractivity(payload)
	}

	return {
		statusCode: 200,
		body: 'TODO: handle Slack commands and interactivity!!',
	};
};
