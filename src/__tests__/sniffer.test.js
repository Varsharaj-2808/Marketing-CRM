process.env.JWT_SECRET = 'test';
const request = require('supertest');
const express = require('express');

let queryCalls = [];
jest.mock("../config/db", () => ({
  query: (sql, params) => {
    queryCalls.push(sql);
    if (sql.includes('users')) return Promise.resolve({ rows: [{ id: 'user-1', role: 'Marketing Executive', name: 'Test' }] });
    if (sql.includes('leads')) return Promise.resolve({ rows: [{ id: 'lead-1', assigned_to: 'user-1' }] });
    if (sql.includes('lead_history')) return Promise.resolve({ rows: [] });
    if (sql.includes('followups')) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [] });
  },
  getClient: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api/marketing", require("../routes/marketing"));

describe('Test', () => {
  it('should capture queries', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 'user-1', role: 'Marketing Executive' }, process.env.JWT_SECRET);
    
    const res = await request(app)
      .get('/api/marketing/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/timeline?type=followup&type=status_change')
      .set('Authorization', `Bearer ${token}`);
      
    console.log('STATUS:', res.status);
    console.log('BODY:', res.body);
    console.log('QUERIES MADE:', queryCalls);
  });
});
