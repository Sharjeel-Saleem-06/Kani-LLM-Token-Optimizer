/**
 * Sample business configuration for the AI Voice Agent Platform
 * 
 * This represents a typical order confirmation scenario for an e-commerce business.
 */

import { Business } from '../models/types';

const sampleBusinessConfig: Business = {
  businessName: 'Acme Shoes',
  businessType: 'E-commerce',
  useCase: 'Order confirmation',
  agentRole: 'Customer service representative',
  tonePreference: 'friendly',
  initialState: 'greeting',
  
  brandingPhrases: {
    intro: 'Thank you for choosing Acme Shoes!',
    outro: 'We appreciate your business and hope you enjoy your new shoes!'
  },
  
  stateDefinitions: {
    'greeting': {
      id: 'greeting',
      name: 'Greeting',
      question: 'Hello, this is Acme Shoes calling to confirm your recent order. Is this a good time to talk?',
      expectedInputs: 'Yes/No response',
      expectedKeywords: 'yes, sure, okay, no, later, busy',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'order_verification'
        },
        {
          condition: 'contains:no',
          targetState: 'reschedule'
        }
      ]
    },
    
    'reschedule': {
      id: 'reschedule',
      name: 'Reschedule Call',
      question: 'When would be a better time for us to call you back?',
      expectedInputs: 'Time/date suggestions',
      expectedKeywords: 'tomorrow, later, evening, afternoon, time',
      transitions: [
        {
          condition: 'regex:.*',
          targetState: 'reschedule_confirmation'
        }
      ]
    },
    
    'reschedule_confirmation': {
      id: 'reschedule_confirmation',
      name: 'Confirm Reschedule',
      question: 'Is there anything else you\'d like us to know before we end this call?',
      expectedInputs: 'Any additional information',
      expectedKeywords: 'yes, no, thanks, information',
      transitions: [
        {
          condition: 'regex:.*',
          targetState: 'goodbye'
        }
      ],
      isTerminal: true
    },
    
    'order_verification': {
      id: 'order_verification',
      name: 'Order Verification',
      question: 'Our records show you ordered the Acme Running Shoes in size 10. Is that correct?',
      expectedInputs: 'Yes/No confirmation',
      expectedKeywords: 'yes, correct, no, wrong, different',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'shipping_confirmation'
        },
        {
          condition: 'contains:no',
          targetState: 'order_correction'
        }
      ]
    },
    
    'order_correction': {
      id: 'order_correction',
      name: 'Order Correction',
      question: 'Could you please tell me what you actually ordered so I can update our records?',
      expectedInputs: 'Reason or objection response',
      expectedKeywords: '(none)',
      transitions: [
        {
          condition: 'any',
          targetState: 'confirmOrderUpdate'
        }
      ]
    },
    
    'correction_confirmation': {
      id: 'correction_confirmation',
      name: 'Confirm Correction',
      question: 'I\'ve noted the correction. Would you like me to read back the updated order details?',
      expectedInputs: 'Yes/No preference',
      expectedKeywords: 'yes, read, no, skip',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'shipping_confirmation'
        },
        {
          condition: 'contains:no',
          targetState: 'shipping_confirmation'
        }
      ]
    },
    
    'shipping_confirmation': {
      id: 'shipping_confirmation',
      name: 'Shipping Confirmation',
      question: 'We plan to ship your order to 123 Main Street, Anytown. Is this address correct?',
      expectedInputs: 'Yes/No confirmation',
      expectedKeywords: 'yes, correct, no, wrong, different',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'payment_verification'
        },
        {
          condition: 'contains:no',
          targetState: 'address_correction'
        }
      ]
    },
    
    'address_correction': {
      id: 'address_correction',
      name: 'Address Correction',
      question: 'Could you please provide the correct shipping address?',
      expectedInputs: 'Address details',
      expectedKeywords: 'street, avenue, road, city, zip, code',
      transitions: [
        {
          condition: 'regex:.*',
          targetState: 'address_confirmation'
        }
      ]
    },
    
    'address_confirmation': {
      id: 'address_confirmation',
      name: 'Confirm Address',
      question: 'I\'ve updated your shipping address. Would you like me to read it back to confirm?',
      expectedInputs: 'Yes/No preference',
      expectedKeywords: 'yes, read, no, skip',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'payment_verification'
        },
        {
          condition: 'contains:no',
          targetState: 'payment_verification'
        }
      ]
    },
    
    'payment_verification': {
      id: 'payment_verification',
      name: 'Payment Verification',
      question: 'We have a credit card ending in 1234 on file for this order. Would you like to continue using this payment method?',
      expectedInputs: 'Yes/No preference',
      expectedKeywords: 'yes, continue, no, change, update',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'delivery_expectations'
        },
        {
          condition: 'contains:no',
          targetState: 'payment_update'
        }
      ]
    },
    
    'payment_update': {
      id: 'payment_update',
      name: 'Payment Update',
      question: 'For security reasons, I\'ll need to transfer you to our secure payment system. Would you like me to do that now?',
      expectedInputs: 'Yes/No or reason for objection',
      expectedKeywords: 'yes, okay, sure, no, later, not now, wait',
      transitions: [
        {
          condition: 'yes, okay, sure',
          targetState: 'transferToPayment'
        },
        {
          condition: 'no, later, not now, wait',
          targetState: 'paymentInstructions'
        }
      ]
    },
    
    'payment_transfer': {
      id: 'payment_transfer',
      name: 'Payment Transfer',
      question: 'Our secure payment system will now assist you. After completing your payment, would you like me to call you back to complete the order confirmation?',
      expectedInputs: 'Any response',
      expectedKeywords: 'yes, no, thanks, call',
      transitions: [
        {
          condition: 'regex:.*',
          targetState: 'goodbye'
        }
      ],
      isTerminal: true
    },
    
    'payment_alternative': {
      id: 'payment_alternative',
      name: 'Alternative Payment',
      question: 'You can update your payment by visiting our website at acmeshoes.com/payment or by calling our customer service at 555-123-4567. Would you like me to email you these instructions?',
      expectedInputs: 'Yes/No preference',
      expectedKeywords: 'yes, email, no, thanks',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'email_confirmation'
        },
        {
          condition: 'contains:no',
          targetState: 'goodbye'
        }
      ]
    },
    
    'email_confirmation': {
      id: 'email_confirmation',
      name: 'Email Confirmation',
      question: 'Could you please confirm your email address for me to send the instructions?',
      expectedInputs: 'Email address',
      expectedKeywords: 'email, @, .com, gmail, yahoo, hotmail',
      transitions: [
        {
          condition: 'regex:.*',
          targetState: 'goodbye'
        }
      ]
    },
    
    'delivery_expectations': {
      id: 'delivery_expectations',
      name: 'Delivery Expectations',
      question: 'Based on your location, your order should arrive within 3-5 business days. Would you like to receive text updates about your delivery?',
      expectedInputs: 'Yes/No preference',
      expectedKeywords: 'yes, updates, text, no',
      transitions: [
        {
          condition: 'contains:yes',
          targetState: 'sms_opt_in'
        },
        {
          condition: 'contains:no',
          targetState: 'feedback_request'
        }
      ]
    },
    
    'sms_opt_in': {
      id: 'sms_opt_in',
      name: 'SMS Opt-In',
      question: 'Could you please confirm the phone number where you\'d like to receive text updates?',
      expectedInputs: 'Phone number',
      expectedKeywords: 'number, phone, cell, mobile, text',
      transitions: [
        {
          condition: 'regex:.*',
          targetState: 'feedback_request'
        }
      ]
    },
    
    'feedback_request': {
      id: 'feedback_request',
      name: 'Feedback Request',
      question: 'Before we finish, do you have any questions or feedback about your order or our service?',
      expectedInputs: 'Any response or feedback',
      expectedKeywords: 'Any',
      transitions: [
        {
          condition: 'no, nope, none, no thanks',
          targetState: 'thankYou'
        },
        {
          condition: 'yes, yeah, yep, sure, okay',
          targetState: 'feedbackResponse'
        }
      ]
    },
    
    'handle_feedback': {
      id: 'handle_feedback',
      name: 'Handle Feedback',
      question: 'Please go ahead with your feedback or questions.',
      expectedInputs: 'Feedback details or questions',
      expectedKeywords: 'service, product, delivery, question, concern',
      transitions: [
        {
          condition: 'regex:.*',
          targetState: 'goodbye'
        }
      ]
    },
    
    'goodbye': {
      id: 'goodbye',
      name: 'Goodbye',
      question: 'Thank you for confirming your order with Acme Shoes. We appreciate your business and hope you enjoy your new shoes! Have a great day!',
      expectedInputs: 'Any final response',
      expectedKeywords: 'thanks, thank you, goodbye, bye',
      transitions: [],
      isTerminal: true
    },
    
    'disqualified': {
      id: 'disqualified',
      name: 'Disqualified',
      question: 'Based on that response, it looks like this option isn\'t a great fit for you right now. Thank you for your time!',
      expectedInputs: 'Any response',
      expectedKeywords: 'ok, okay, understand, thanks',
      transitions: [],
      isTerminal: true
    }
  },
  
  disqualificationRules: [
    {
      condition: 'contains:cancel my order',
      message: 'I understand you want to cancel your order. I\'ll connect you with our customer service team who can help you with that. Thank you for letting us know.'
    },
    {
      condition: 'contains:complaint',
      message: 'I\'m sorry to hear You\'re having issues. I\'ll make sure your complaint is forwarded to our customer service team who will contact you to resolve this matter.'
    },
    {
      condition: 'contains:fuck',
      message: 'I apologize, but I\'ll need to end this call now. If you have concerns about your order, please contact our customer service team directly. Thank you.'
    }
  ],
  
  completionActions: {
    webhook: 'https://acmeshoes.com/api/webhook',
    email: 'orders@acmeshoes.com',
    notifyHuman: true
  },
  
  locale: 'en-US'
};

export default sampleBusinessConfig; 
