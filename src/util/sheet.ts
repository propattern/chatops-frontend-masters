import { JWT } from 'google-auth-library';
const { GoogleSpreadsheet } = require("google-spreadsheet");
import {credentials} from './credential'

type Feedback = {
    Date: string
    Feedback: string
    Satisfaction: string
    Name: string
  }

export const saveFeedback = async (feedback: Feedback) => {
    const serviceAccountAuth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });

    const doc = new GoogleSpreadsheet("1aoJMKY6_0cJ1az7tSM8ZpLDcFD5HB_XcdUAvzQBj0jo", serviceAccountAuth);
    await doc.loadInfo();
    const worksheet = doc.sheetsByIndex[0]; // Here, 1st tab on Google Spreadsheet is used.

    await worksheet.setHeaderRow(['Date', 'Feedback', 'Satisfaction', 'Name']); // This is the header row.
    await worksheet.addRows([feedback]); // Your value is put to the sheet.
  };