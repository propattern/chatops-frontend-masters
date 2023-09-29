import fetch from "node-fetch";
import type { Handler } from '@netlify/functions';
import {parse} from 'querystring'
import { blocks, getUsernames, modal, slackApi, verifySlackRequest } from './util/slack';
import { saveFeedback } from "./util/sheet";

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
	const callback_id = payload.callback_id ?? payload?.view?.callback_id;
	let action = ''
	if (!callback_id) {
		const {actions} = payload;
		const {value} = actions![0]
		action = value
	}

	switch(callback_id || action) {
		case 'foodfight-modal':
			const data = payload.view.state.values;
			const fields = {
				Feedback: data.opinion_block.opinion.value,
				Satisfaction: data.spice_level_block.spice_level.selected_option.value,
				Name: payload.user.name,
				Date: new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })
			}

			const {view} = payload;
			const {blocks: blacks} = view;
			const section = blacks[0] as SlackBlockSection
			const {text} = section
			const {text: transactionText} = text;
			const chatId = transactionText.replace('Experimentation Feedback: ', '');

			await saveFeedback(fields);
			
			await slackApi('chat.delete', {
				channel: payload.user.id,
				ts: chatId.trim(),
			})

			await slackApi('chat.postMessage', {
				channel: payload.user.id,
				ts: chatId.trim(),
				blocks: [
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							text: `Feedback Given :white_check_mark:. Thank you  ${payload.user.name}`
						}
					}
				]
			})
			break;

		case 'give_me_feedback':
			const {container} = payload;
			const {message_ts} = container;
			const response = await slackApi('views.open', 
			modal({
					id: 'foodfight-modal',
					title: 'Start a food fight',
					trigger_id: payload.trigger_id,
					blocks: [
						blocks.section({
							text: `Experimentation Feedback: ${message_ts}`
						}),
						blocks.radios({
							id: 'spice_level',
							label: 'How satisfied are you with the support you receive from the team?',
							placeholder: 'Select a spice level XXX',
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

	const bs = [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Please click on the button :point_down::skin-tone-2: below to give quick feedback based on your experience in Experimentation Surgery"
			}
		},
		{
			"type": "actions",
			"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "SURGERY FEEDBACK",
						"emoji": true
					},
					"value": "give_me_feedback"
				}
			]
		}
	]

	await slackApi('chat.postMessage', {
		channel: channel,
		blocks: bs
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
