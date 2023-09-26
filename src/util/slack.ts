import { HandlerEvent } from "@netlify/functions";
import { createHmac } from "crypto";
import fetch from "node-fetch";
import { title } from "process";

export const slackApi = (endpoint: SlackApiEndpoint, body: SlackApiRequestBody) => {
    return fetch(`https://slack.com/api/${endpoint}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_OAUTH_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
            as_user: 'true'
        },
        body: JSON.stringify(body)
    }).then(res=> res.json())
}

export const verifySlackRequest = (request: HandlerEvent) => {
    const secret = process.env.SLACK_SIGNIN_SECRET!;
    const signature = request.headers['x-slack-signature']
    const timestamp = Number(request.headers['x-slack-request-timestamp'])

    const now = Math.floor(Date.now()/1000);

    if (Math.abs(now - timestamp) > 300) {
        return false;
    }

    const hash = createHmac('sha256', secret)
    .update(`v0:${timestamp}:${request.body}`)
    .digest('hex');

    return `v0=${hash}` === signature;
}

export const blocks = {
    section: ({text}: SectionBlockArgs): SlackBlockSection => {
        return {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: text
            }
        }
    },
    input: ({
        id, label, placeholder, initial_value = '', hint='', type = 'plain_text_input'
    }: InputBlockArgs): SlackBlockInput => {
        return {
            block_id: `${id}_block`,
            type: 'input',
            label : {
                type: 'plain_text',
                text: label
            },
            element: {
                action_id: id,
                type: type,
                placeholder: {
                    type: 'plain_text',
                    text: placeholder
                },
                initial_value
            },
            hint: {
                type: 'plain_text',
                text: hint
            }
        }
    },
    select: ({
        id, label, 
        placeholder, options
    }: SelectBlockArgs): SlackBlockInput => {
        return {
            block_id: `${id}_block`,
            type: 'input',
            label : {
                type: 'plain_text',
                text: label
            },
            element : {
                action_id: id,
                type: 'static_select',
                placeholder: {
                    type: 'plain_text',
                    text: placeholder,
                    emoji: true
                },
                options: options.map(({label, value}) => {
                    return { 
                        text: {
                            type: 'plain_text',
                            text: label,
                            emoji: true
                        },
                        value
                    }
                })
            }
        }
    },
    radios: ({
        id, label, 
        placeholder, options
    }: SelectBlockArgs): SlackBlockInput => {
        return {
            block_id: `${id}_block`,
            type: 'input',
            label : {
                type: 'plain_text',
                text: label
            },
            element : {
                action_id: id,
                type: 'radio_buttons',
                options: options.map(({label, value}) => {
                    return { 
                        text: {
                            type: 'plain_text',
                            text: label,
                            emoji: true
                        },
                        value
                    }
                })
            }
        }
    }
}

export function  modal ({
    trigger_id,
    id,
    submit_text = 'Submit',
    blocks
}: ModalArgs) {
    return {
        trigger_id,
        view: {
            type: 'modal',
            callback_id: id,
            title: {
                type: 'plain_text',
                text: title
            },
            submit: {
                type: 'plain_text',
                text: submit_text
            },
            blocks
        }
    }
}

const  onlyUnique = (value: string, index: number, items: string[]) => {
    return items.indexOf(value) === index;
}

export const getUsernames = (text: string = '') => {
    if (!text) {
      return []
    }
  
    const tokens = text.split(' ')
    const usernames = tokens.reduce((acc: string[], token: string) : string[] => {
      const arrowsReplaced = token.replace('<', '').replace('>', '')
      const username = arrowsReplaced.split('|')
      if (username.length == 2) {
        acc.push(username[0])
      }
      return acc
    }, [])

    return usernames.filter(onlyUnique);
  }
  