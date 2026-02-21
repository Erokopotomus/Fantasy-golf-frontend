import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'
import useDraftSounds from '../hooks/useDraftSounds'
import { track, Events } from '../services/analytics'

// Inline player data for mock drafts (no API dependency)
const MOCK_PLAYERS = [
  { id: 'p1', name: 'Scottie Scheffler', rank: 1, country: 'USA', flag: '🇺🇸', sg: 2.45 },
  { id: 'p2', name: 'Rory McIlroy', rank: 2, country: 'NIR', flag: '🇬🇧', sg: 2.12 },
  { id: 'p3', name: 'Jon Rahm', rank: 3, country: 'ESP', flag: '🇪🇸', sg: 1.98 },
  { id: 'p4', name: 'Viktor Hovland', rank: 4, country: 'NOR', flag: '🇳🇴', sg: 1.87 },
  { id: 'p5', name: 'Patrick Cantlay', rank: 5, country: 'USA', flag: '🇺🇸', sg: 1.76 },
  { id: 'p6', name: 'Xander Schauffele', rank: 6, country: 'USA', flag: '🇺🇸', sg: 1.72 },
  { id: 'p7', name: 'Collin Morikawa', rank: 7, country: 'USA', flag: '🇺🇸', sg: 1.65 },
  { id: 'p8', name: 'Ludvig Aberg', rank: 8, country: 'SWE', flag: '🇸🇪', sg: 1.58 },
  { id: 'p9', name: 'Wyndham Clark', rank: 9, country: 'USA', flag: '🇺🇸', sg: 1.52 },
  { id: 'p10', name: 'Max Homa', rank: 10, country: 'USA', flag: '🇺🇸', sg: 1.48 },
  { id: 'p11', name: 'Tommy Fleetwood', rank: 11, country: 'ENG', flag: '🇬🇧', sg: 1.45 },
  { id: 'p12', name: 'Matt Fitzpatrick', rank: 12, country: 'ENG', flag: '🇬🇧', sg: 1.42 },
  { id: 'p13', name: 'Brian Harman', rank: 13, country: 'USA', flag: '🇺🇸', sg: 1.38 },
  { id: 'p14', name: 'Hideki Matsuyama', rank: 14, country: 'JPN', flag: '🇯🇵', sg: 1.35 },
  { id: 'p15', name: 'Sahith Theegala', rank: 15, country: 'USA', flag: '🇺🇸', sg: 1.32 },
  { id: 'p16', name: 'Tony Finau', rank: 16, country: 'USA', flag: '🇺🇸', sg: 1.28 },
  { id: 'p17', name: 'Cameron Young', rank: 17, country: 'USA', flag: '🇺🇸', sg: 1.25 },
  { id: 'p18', name: 'Sungjae Im', rank: 18, country: 'KOR', flag: '🇰🇷', sg: 1.22 },
  { id: 'p19', name: 'Corey Conners', rank: 19, country: 'CAN', flag: '🇨🇦', sg: 1.18 },
  { id: 'p20', name: 'Russell Henley', rank: 20, country: 'USA', flag: '🇺🇸', sg: 1.15 },
  { id: 'p21', name: 'Shane Lowry', rank: 21, country: 'IRL', flag: '🇮🇪', sg: 1.12 },
  { id: 'p22', name: 'Jordan Spieth', rank: 22, country: 'USA', flag: '🇺🇸', sg: 1.08 },
  { id: 'p23', name: 'Tom Kim', rank: 23, country: 'KOR', flag: '🇰🇷', sg: 1.05 },
  { id: 'p24', name: 'Sepp Straka', rank: 24, country: 'AUT', flag: '🇦🇹', sg: 1.02 },
  { id: 'p25', name: 'Keegan Bradley', rank: 25, country: 'USA', flag: '🇺🇸', sg: 0.98 },
  { id: 'p26', name: 'Justin Thomas', rank: 26, country: 'USA', flag: '🇺🇸', sg: 0.95 },
  { id: 'p27', name: 'Adam Scott', rank: 27, country: 'AUS', flag: '🇦🇺', sg: 0.92 },
  { id: 'p28', name: 'Si Woo Kim', rank: 28, country: 'KOR', flag: '🇰🇷', sg: 0.88 },
  { id: 'p29', name: 'Tyrrell Hatton', rank: 29, country: 'ENG', flag: '🇬🇧', sg: 0.85 },
  { id: 'p30', name: 'Jason Day', rank: 30, country: 'AUS', flag: '🇦🇺', sg: 0.82 },
  { id: 'p31', name: 'Denny McCarthy', rank: 31, country: 'USA', flag: '🇺🇸', sg: 0.78 },
  { id: 'p32', name: 'Rickie Fowler', rank: 32, country: 'USA', flag: '🇺🇸', sg: 0.75 },
  { id: 'p33', name: 'Cameron Smith', rank: 33, country: 'AUS', flag: '🇦🇺', sg: 0.72 },
  { id: 'p34', name: 'Brooks Koepka', rank: 34, country: 'USA', flag: '🇺🇸', sg: 0.68 },
  { id: 'p35', name: 'Min Woo Lee', rank: 35, country: 'AUS', flag: '🇦🇺', sg: 0.65 },
  { id: 'p36', name: 'Taylor Moore', rank: 36, country: 'USA', flag: '🇺🇸', sg: 0.62 },
  { id: 'p37', name: 'Billy Horschel', rank: 37, country: 'USA', flag: '🇺🇸', sg: 0.58 },
  { id: 'p38', name: 'Nick Taylor', rank: 38, country: 'CAN', flag: '🇨🇦', sg: 0.55 },
  { id: 'p39', name: 'Akshay Bhatia', rank: 39, country: 'USA', flag: '🇺🇸', sg: 0.52 },
  { id: 'p40', name: 'Sam Burns', rank: 40, country: 'USA', flag: '🇺🇸', sg: 0.48 },
  { id: 'p41', name: 'Chris Kirk', rank: 41, country: 'USA', flag: '🇺🇸', sg: 0.45 },
  { id: 'p42', name: 'Harris English', rank: 42, country: 'USA', flag: '🇺🇸', sg: 0.42 },
  { id: 'p43', name: 'Mackenzie Hughes', rank: 43, country: 'CAN', flag: '🇨🇦', sg: 0.38 },
  { id: 'p44', name: 'Kurt Kitayama', rank: 44, country: 'USA', flag: '🇺🇸', sg: 0.35 },
  { id: 'p45', name: 'Adam Hadwin', rank: 45, country: 'CAN', flag: '🇨🇦', sg: 0.32 },
  { id: 'p46', name: 'Davis Riley', rank: 46, country: 'USA', flag: '🇺🇸', sg: 0.28 },
  { id: 'p47', name: 'Erik van Rooyen', rank: 47, country: 'RSA', flag: '🇿🇦', sg: 0.25 },
  { id: 'p48', name: 'Lucas Glover', rank: 48, country: 'USA', flag: '🇺🇸', sg: 0.22 },
  { id: 'p49', name: 'J.T. Poston', rank: 49, country: 'USA', flag: '🇺🇸', sg: 0.18 },
  { id: 'p50', name: 'Andrew Putnam', rank: 50, country: 'USA', flag: '🇺🇸', sg: 0.15 },
  { id: 'p51', name: 'Emiliano Grillo', rank: 51, country: 'ARG', flag: '🇦🇷', sg: 0.12 },
  { id: 'p52', name: 'Taylor Pendrith', rank: 52, country: 'CAN', flag: '🇨🇦', sg: 0.10 },
  { id: 'p53', name: 'Thomas Detry', rank: 53, country: 'BEL', flag: '🇧🇪', sg: 0.08 },
  { id: 'p54', name: 'Byeong Hun An', rank: 54, country: 'KOR', flag: '🇰🇷', sg: 0.05 },
  { id: 'p55', name: 'Christiaan Bezuidenhout', rank: 55, country: 'RSA', flag: '🇿🇦', sg: 0.02 },
  { id: 'p56', name: 'Austin Eckroat', rank: 56, country: 'USA', flag: '🇺🇸', sg: -0.02 },
  { id: 'p57', name: 'Ben Griffin', rank: 57, country: 'USA', flag: '🇺🇸', sg: -0.05 },
  { id: 'p58', name: 'Alex Noren', rank: 58, country: 'SWE', flag: '🇸🇪', sg: -0.08 },
  { id: 'p59', name: 'Stephan Jaeger', rank: 59, country: 'GER', flag: '🇩🇪', sg: -0.10 },
  { id: 'p60', name: 'Jake Knapp', rank: 60, country: 'USA', flag: '🇺🇸', sg: -0.12 },
]

// NFL fallback players (~150, ranked by 2024 half-PPR PPG)
const MOCK_NFL_PLAYERS = [
  { id: 'nfl-1', name: 'CeeDee Lamb', rank: 1, position: 'WR', team: 'DAL', ppg: 21.4 },
  { id: 'nfl-2', name: 'Tyreek Hill', rank: 2, position: 'WR', team: 'MIA', ppg: 20.8 },
  { id: 'nfl-3', name: 'Ja\'Marr Chase', rank: 3, position: 'WR', team: 'CIN', ppg: 20.5 },
  { id: 'nfl-4', name: 'Christian McCaffrey', rank: 4, position: 'RB', team: 'SF', ppg: 20.2 },
  { id: 'nfl-5', name: 'Amon-Ra St. Brown', rank: 5, position: 'WR', team: 'DET', ppg: 19.8 },
  { id: 'nfl-6', name: 'Bijan Robinson', rank: 6, position: 'RB', team: 'ATL', ppg: 19.5 },
  { id: 'nfl-7', name: 'Josh Allen', rank: 7, position: 'QB', team: 'BUF', ppg: 25.1 },
  { id: 'nfl-8', name: 'Jalen Hurts', rank: 8, position: 'QB', team: 'PHI', ppg: 24.3 },
  { id: 'nfl-9', name: 'Lamar Jackson', rank: 9, position: 'QB', team: 'BAL', ppg: 24.0 },
  { id: 'nfl-10', name: 'Breece Hall', rank: 10, position: 'RB', team: 'NYJ', ppg: 18.2 },
  { id: 'nfl-11', name: 'Garrett Wilson', rank: 11, position: 'WR', team: 'NYJ', ppg: 17.6 },
  { id: 'nfl-12', name: 'Travis Kelce', rank: 12, position: 'TE', team: 'KC', ppg: 16.8 },
  { id: 'nfl-13', name: 'Puka Nacua', rank: 13, position: 'WR', team: 'LAR', ppg: 18.9 },
  { id: 'nfl-14', name: 'Davante Adams', rank: 14, position: 'WR', team: 'LV', ppg: 17.2 },
  { id: 'nfl-15', name: 'Sam LaPorta', rank: 15, position: 'TE', team: 'DET', ppg: 14.5 },
  { id: 'nfl-16', name: 'Patrick Mahomes', rank: 16, position: 'QB', team: 'KC', ppg: 22.5 },
  { id: 'nfl-17', name: 'Kyren Williams', rank: 17, position: 'RB', team: 'LAR', ppg: 17.1 },
  { id: 'nfl-18', name: 'De\'Von Achane', rank: 18, position: 'RB', team: 'MIA', ppg: 18.0 },
  { id: 'nfl-19', name: 'A.J. Brown', rank: 19, position: 'WR', team: 'PHI', ppg: 17.8 },
  { id: 'nfl-20', name: 'Derrick Henry', rank: 20, position: 'RB', team: 'BAL', ppg: 16.5 },
  { id: 'nfl-21', name: 'Mike Evans', rank: 21, position: 'WR', team: 'TB', ppg: 16.2 },
  { id: 'nfl-22', name: 'Deebo Samuel', rank: 22, position: 'WR', team: 'SF', ppg: 15.9 },
  { id: 'nfl-23', name: 'Chris Olave', rank: 23, position: 'WR', team: 'NO', ppg: 15.6 },
  { id: 'nfl-24', name: 'Jonathan Taylor', rank: 24, position: 'RB', team: 'IND', ppg: 15.8 },
  { id: 'nfl-25', name: 'Saquon Barkley', rank: 25, position: 'RB', team: 'PHI', ppg: 16.0 },
  { id: 'nfl-26', name: 'Travis Etienne', rank: 26, position: 'RB', team: 'JAX', ppg: 15.2 },
  { id: 'nfl-27', name: 'DK Metcalf', rank: 27, position: 'WR', team: 'SEA', ppg: 15.4 },
  { id: 'nfl-28', name: 'Jaylen Waddle', rank: 28, position: 'WR', team: 'MIA', ppg: 15.0 },
  { id: 'nfl-29', name: 'Joe Burrow', rank: 29, position: 'QB', team: 'CIN', ppg: 21.8 },
  { id: 'nfl-30', name: 'Dak Prescott', rank: 30, position: 'QB', team: 'DAL', ppg: 21.2 },
  { id: 'nfl-31', name: 'Mark Andrews', rank: 31, position: 'TE', team: 'BAL', ppg: 13.8 },
  { id: 'nfl-32', name: 'Jahmyr Gibbs', rank: 32, position: 'RB', team: 'DET', ppg: 15.5 },
  { id: 'nfl-33', name: 'Isiah Pacheco', rank: 33, position: 'RB', team: 'KC', ppg: 14.2 },
  { id: 'nfl-34', name: 'Rachaad White', rank: 34, position: 'RB', team: 'TB', ppg: 13.8 },
  { id: 'nfl-35', name: 'Brandon Aiyuk', rank: 35, position: 'WR', team: 'SF', ppg: 14.5 },
  { id: 'nfl-36', name: 'Stefon Diggs', rank: 36, position: 'WR', team: 'HOU', ppg: 14.2 },
  { id: 'nfl-37', name: 'Tank Dell', rank: 37, position: 'WR', team: 'HOU', ppg: 14.8 },
  { id: 'nfl-38', name: 'Tee Higgins', rank: 38, position: 'WR', team: 'CIN', ppg: 14.0 },
  { id: 'nfl-39', name: 'DeVonta Smith', rank: 39, position: 'WR', team: 'PHI', ppg: 13.8 },
  { id: 'nfl-40', name: 'George Kittle', rank: 40, position: 'TE', team: 'SF', ppg: 12.5 },
  { id: 'nfl-41', name: 'Josh Jacobs', rank: 41, position: 'RB', team: 'GB', ppg: 13.5 },
  { id: 'nfl-42', name: 'Rhamondre Stevenson', rank: 42, position: 'RB', team: 'NE', ppg: 13.0 },
  { id: 'nfl-43', name: 'C.J. Stroud', rank: 43, position: 'QB', team: 'HOU', ppg: 20.5 },
  { id: 'nfl-44', name: 'Tua Tagovailoa', rank: 44, position: 'QB', team: 'MIA', ppg: 20.0 },
  { id: 'nfl-45', name: 'Justin Jefferson', rank: 45, position: 'WR', team: 'MIN', ppg: 18.5 },
  { id: 'nfl-46', name: 'Jordan Addison', rank: 46, position: 'WR', team: 'MIN', ppg: 13.2 },
  { id: 'nfl-47', name: 'Marquise Brown', rank: 47, position: 'WR', team: 'ARI', ppg: 12.8 },
  { id: 'nfl-48', name: 'Keenan Allen', rank: 48, position: 'WR', team: 'CHI', ppg: 12.5 },
  { id: 'nfl-49', name: 'Joe Mixon', rank: 49, position: 'RB', team: 'HOU', ppg: 13.2 },
  { id: 'nfl-50', name: 'Aaron Jones', rank: 50, position: 'RB', team: 'MIN', ppg: 12.8 },
  { id: 'nfl-51', name: 'Tony Pollard', rank: 51, position: 'RB', team: 'TEN', ppg: 12.5 },
  { id: 'nfl-52', name: 'Najee Harris', rank: 52, position: 'RB', team: 'PIT', ppg: 12.2 },
  { id: 'nfl-53', name: 'Kenneth Walker III', rank: 53, position: 'RB', team: 'SEA', ppg: 13.0 },
  { id: 'nfl-54', name: 'James Cook', rank: 54, position: 'RB', team: 'BUF', ppg: 12.5 },
  { id: 'nfl-55', name: 'Dalton Kincaid', rank: 55, position: 'TE', team: 'BUF', ppg: 11.8 },
  { id: 'nfl-56', name: 'T.J. Hockenson', rank: 56, position: 'TE', team: 'MIN', ppg: 12.2 },
  { id: 'nfl-57', name: 'Jared Goff', rank: 57, position: 'QB', team: 'DET', ppg: 19.5 },
  { id: 'nfl-58', name: 'Anthony Richardson', rank: 58, position: 'QB', team: 'IND', ppg: 19.0 },
  { id: 'nfl-59', name: 'Jordan Love', rank: 59, position: 'QB', team: 'GB', ppg: 19.2 },
  { id: 'nfl-60', name: 'Drake London', rank: 60, position: 'WR', team: 'ATL', ppg: 12.0 },
  { id: 'nfl-61', name: 'DJ Moore', rank: 61, position: 'WR', team: 'CHI', ppg: 12.2 },
  { id: 'nfl-62', name: 'Michael Pittman Jr.', rank: 62, position: 'WR', team: 'IND', ppg: 11.8 },
  { id: 'nfl-63', name: 'Zay Flowers', rank: 63, position: 'WR', team: 'BAL', ppg: 12.5 },
  { id: 'nfl-64', name: 'Nico Collins', rank: 64, position: 'WR', team: 'HOU', ppg: 14.0 },
  { id: 'nfl-65', name: 'Terry McLaurin', rank: 65, position: 'WR', team: 'WAS', ppg: 11.5 },
  { id: 'nfl-66', name: 'Christian Kirk', rank: 66, position: 'WR', team: 'JAX', ppg: 11.2 },
  { id: 'nfl-67', name: 'David Njoku', rank: 67, position: 'TE', team: 'CLE', ppg: 10.8 },
  { id: 'nfl-68', name: 'Evan Engram', rank: 68, position: 'TE', team: 'JAX', ppg: 11.0 },
  { id: 'nfl-69', name: 'Brian Robinson Jr.', rank: 69, position: 'RB', team: 'WAS', ppg: 11.5 },
  { id: 'nfl-70', name: 'David Montgomery', rank: 70, position: 'RB', team: 'DET', ppg: 12.0 },
  { id: 'nfl-71', name: 'James Conner', rank: 71, position: 'RB', team: 'ARI', ppg: 11.8 },
  { id: 'nfl-72', name: 'Alvin Kamara', rank: 72, position: 'RB', team: 'NO', ppg: 14.5 },
  { id: 'nfl-73', name: 'Nick Chubb', rank: 73, position: 'RB', team: 'CLE', ppg: 11.0 },
  { id: 'nfl-74', name: 'Javonte Williams', rank: 74, position: 'RB', team: 'DEN', ppg: 10.5 },
  { id: 'nfl-75', name: 'Zack Moss', rank: 75, position: 'RB', team: 'CIN', ppg: 11.2 },
  { id: 'nfl-76', name: 'Brock Purdy', rank: 76, position: 'QB', team: 'SF', ppg: 18.8 },
  { id: 'nfl-77', name: 'Trevor Lawrence', rank: 77, position: 'QB', team: 'JAX', ppg: 18.0 },
  { id: 'nfl-78', name: 'Kyler Murray', rank: 78, position: 'QB', team: 'ARI', ppg: 18.5 },
  { id: 'nfl-79', name: 'Caleb Williams', rank: 79, position: 'QB', team: 'CHI', ppg: 17.5 },
  { id: 'nfl-80', name: 'Jayden Daniels', rank: 80, position: 'QB', team: 'WAS', ppg: 18.2 },
  { id: 'nfl-81', name: 'Rome Odunze', rank: 81, position: 'WR', team: 'CHI', ppg: 10.5 },
  { id: 'nfl-82', name: 'Rashee Rice', rank: 82, position: 'WR', team: 'KC', ppg: 12.8 },
  { id: 'nfl-83', name: 'George Pickens', rank: 83, position: 'WR', team: 'PIT', ppg: 11.8 },
  { id: 'nfl-84', name: 'Diontae Johnson', rank: 84, position: 'WR', team: 'CAR', ppg: 10.8 },
  { id: 'nfl-85', name: 'Curtis Samuel', rank: 85, position: 'WR', team: 'BUF', ppg: 10.2 },
  { id: 'nfl-86', name: 'Tyler Lockett', rank: 86, position: 'WR', team: 'SEA', ppg: 10.0 },
  { id: 'nfl-87', name: 'Courtland Sutton', rank: 87, position: 'WR', team: 'DEN', ppg: 10.5 },
  { id: 'nfl-88', name: 'Gabe Davis', rank: 88, position: 'WR', team: 'JAX', ppg: 9.8 },
  { id: 'nfl-89', name: 'Pat Freiermuth', rank: 89, position: 'TE', team: 'PIT', ppg: 9.5 },
  { id: 'nfl-90', name: 'Jake Ferguson', rank: 90, position: 'TE', team: 'DAL', ppg: 10.2 },
  { id: 'nfl-91', name: 'Chuba Hubbard', rank: 91, position: 'RB', team: 'CAR', ppg: 10.0 },
  { id: 'nfl-92', name: 'D\'Andre Swift', rank: 92, position: 'RB', team: 'CHI', ppg: 10.8 },
  { id: 'nfl-93', name: 'Austin Ekeler', rank: 93, position: 'RB', team: 'WAS', ppg: 11.0 },
  { id: 'nfl-94', name: 'Miles Sanders', rank: 94, position: 'RB', team: 'CAR', ppg: 9.2 },
  { id: 'nfl-95', name: 'Tyler Allgeier', rank: 95, position: 'RB', team: 'ATL', ppg: 9.5 },
  { id: 'nfl-96', name: 'Jaylen Warren', rank: 96, position: 'RB', team: 'PIT', ppg: 9.8 },
  { id: 'nfl-97', name: 'Gus Edwards', rank: 97, position: 'RB', team: 'LAC', ppg: 9.0 },
  { id: 'nfl-98', name: 'Tyjae Spears', rank: 98, position: 'RB', team: 'TEN', ppg: 10.2 },
  { id: 'nfl-99', name: 'Jerome Ford', rank: 99, position: 'RB', team: 'CLE', ppg: 9.5 },
  { id: 'nfl-100', name: 'Zamir White', rank: 100, position: 'RB', team: 'LV', ppg: 9.8 },
  { id: 'nfl-101', name: 'Matthew Stafford', rank: 101, position: 'QB', team: 'LAR', ppg: 17.2 },
  { id: 'nfl-102', name: 'Deshaun Watson', rank: 102, position: 'QB', team: 'CLE', ppg: 16.5 },
  { id: 'nfl-103', name: 'Kirk Cousins', rank: 103, position: 'QB', team: 'ATL', ppg: 17.0 },
  { id: 'nfl-104', name: 'Geno Smith', rank: 104, position: 'QB', team: 'SEA', ppg: 17.5 },
  { id: 'nfl-105', name: 'Baker Mayfield', rank: 105, position: 'QB', team: 'TB', ppg: 17.8 },
  { id: 'nfl-106', name: 'Marvin Harrison Jr.', rank: 106, position: 'WR', team: 'ARI', ppg: 11.5 },
  { id: 'nfl-107', name: 'Malik Nabers', rank: 107, position: 'WR', team: 'NYG', ppg: 11.0 },
  { id: 'nfl-108', name: 'Josh Downs', rank: 108, position: 'WR', team: 'IND', ppg: 10.2 },
  { id: 'nfl-109', name: 'Jaxon Smith-Njigba', rank: 109, position: 'WR', team: 'SEA', ppg: 10.0 },
  { id: 'nfl-110', name: 'Quentin Johnston', rank: 110, position: 'WR', team: 'LAC', ppg: 9.5 },
  { id: 'nfl-111', name: 'Jameson Williams', rank: 111, position: 'WR', team: 'DET', ppg: 9.8 },
  { id: 'nfl-112', name: 'Darnell Mooney', rank: 112, position: 'WR', team: 'ATL', ppg: 9.5 },
  { id: 'nfl-113', name: 'Cole Kmet', rank: 113, position: 'TE', team: 'CHI', ppg: 9.0 },
  { id: 'nfl-114', name: 'Dallas Goedert', rank: 114, position: 'TE', team: 'PHI', ppg: 9.5 },
  { id: 'nfl-115', name: 'Kyle Pitts', rank: 115, position: 'TE', team: 'ATL', ppg: 8.5 },
  { id: 'nfl-116', name: 'Jonnu Smith', rank: 116, position: 'TE', team: 'MIA', ppg: 8.0 },
  { id: 'nfl-117', name: 'Harrison Butker', rank: 117, position: 'K', team: 'KC', ppg: 9.2 },
  { id: 'nfl-118', name: 'Brandon Aubrey', rank: 118, position: 'K', team: 'DAL', ppg: 9.5 },
  { id: 'nfl-119', name: 'Jake Moody', rank: 119, position: 'K', team: 'SF', ppg: 8.8 },
  { id: 'nfl-120', name: 'Tyler Bass', rank: 120, position: 'K', team: 'BUF', ppg: 8.5 },
  { id: 'nfl-121', name: 'Justin Tucker', rank: 121, position: 'K', team: 'BAL', ppg: 8.2 },
  { id: 'nfl-122', name: 'Younghoe Koo', rank: 122, position: 'K', team: 'ATL', ppg: 8.0 },
  { id: 'nfl-123', name: 'Ka\'imi Fairbairn', rank: 123, position: 'K', team: 'HOU', ppg: 8.5 },
  { id: 'nfl-124', name: 'Evan McPherson', rank: 124, position: 'K', team: 'CIN', ppg: 7.8 },
  { id: 'nfl-125', name: 'Jason Sanders', rank: 125, position: 'K', team: 'MIA', ppg: 7.5 },
  { id: 'nfl-126', name: 'Cameron Dicker', rank: 126, position: 'K', team: 'LAC', ppg: 8.0 },
  { id: 'nfl-127', name: 'Dallas Cowboys', rank: 127, position: 'DEF', team: 'DAL', ppg: 8.5 },
  { id: 'nfl-128', name: 'San Francisco 49ers', rank: 128, position: 'DEF', team: 'SF', ppg: 8.2 },
  { id: 'nfl-129', name: 'Buffalo Bills', rank: 129, position: 'DEF', team: 'BUF', ppg: 8.0 },
  { id: 'nfl-130', name: 'Cleveland Browns', rank: 130, position: 'DEF', team: 'CLE', ppg: 7.8 },
  { id: 'nfl-131', name: 'New York Jets', rank: 131, position: 'DEF', team: 'NYJ', ppg: 7.5 },
  { id: 'nfl-132', name: 'Baltimore Ravens', rank: 132, position: 'DEF', team: 'BAL', ppg: 7.2 },
  { id: 'nfl-133', name: 'Pittsburgh Steelers', rank: 133, position: 'DEF', team: 'PIT', ppg: 7.0 },
  { id: 'nfl-134', name: 'Miami Dolphins', rank: 134, position: 'DEF', team: 'MIA', ppg: 6.8 },
  { id: 'nfl-135', name: 'Kansas City Chiefs', rank: 135, position: 'DEF', team: 'KC', ppg: 6.5 },
  { id: 'nfl-136', name: 'Philadelphia Eagles', rank: 136, position: 'DEF', team: 'PHI', ppg: 6.2 },
  { id: 'nfl-137', name: 'Jonathon Brooks', rank: 137, position: 'RB', team: 'CAR', ppg: 9.0 },
  { id: 'nfl-138', name: 'Bucky Irving', rank: 138, position: 'RB', team: 'TB', ppg: 9.2 },
  { id: 'nfl-139', name: 'Rico Dowdle', rank: 139, position: 'RB', team: 'DAL', ppg: 8.8 },
  { id: 'nfl-140', name: 'Chase Brown', rank: 140, position: 'RB', team: 'CIN', ppg: 8.5 },
  { id: 'nfl-141', name: 'Raheem Mostert', rank: 141, position: 'RB', team: 'MIA', ppg: 10.0 },
  { id: 'nfl-142', name: 'Deuce Vaughn', rank: 142, position: 'RB', team: 'DAL', ppg: 7.5 },
  { id: 'nfl-143', name: 'Will Levis', rank: 143, position: 'QB', team: 'TEN', ppg: 15.5 },
  { id: 'nfl-144', name: 'Sam Howell', rank: 144, position: 'QB', team: 'SEA', ppg: 15.0 },
  { id: 'nfl-145', name: 'Bryce Young', rank: 145, position: 'QB', team: 'CAR', ppg: 14.5 },
  { id: 'nfl-146', name: 'Drake Maye', rank: 146, position: 'QB', team: 'NE', ppg: 15.8 },
  { id: 'nfl-147', name: 'Bo Nix', rank: 147, position: 'QB', team: 'DEN', ppg: 16.0 },
  { id: 'nfl-148', name: 'Trey McBride', rank: 148, position: 'TE', team: 'ARI', ppg: 10.5 },
  { id: 'nfl-149', name: 'Michael Mayer', rank: 149, position: 'TE', team: 'LV', ppg: 7.5 },
  { id: 'nfl-150', name: 'Luke Musgrave', rank: 150, position: 'TE', team: 'GB', ppg: 7.0 },
]

// NFL position badge colors
const NFL_POS_COLORS = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-emerald-500/20 text-emerald-400',
  WR: 'bg-blue-500/20 text-blue-400',
  TE: 'bg-orange-500/20 text-orange-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-teal-500/20 text-teal-400',
}

// NFL position-aware AI drafting
const NFL_POS_CAPS = { QB: 2, RB: 5, WR: 5, TE: 2, K: 1, DEF: 1 }

function aiSelectPlayer(available, teamPicks, sport) {
  if (sport !== 'nfl' || available.length === 0) {
    // Golf: random from top 4
    const topN = Math.min(4, available.length)
    return available[Math.floor(Math.random() * topN)]
  }
  // NFL: position-aware
  const posCounts = {}
  teamPicks.forEach(p => {
    if (p.playerPosition) posCounts[p.playerPosition] = (posCounts[p.playerPosition] || 0) + 1
  })
  const filtered = available.filter(p => {
    const cap = NFL_POS_CAPS[p.position] || 3
    return (posCounts[p.position] || 0) < cap
  })
  const pool = filtered.length > 0 ? filtered : available
  const topN = Math.min(6, pool.length)
  // Weighted random: higher rank = higher weight
  const weights = pool.slice(0, topN).map((_, i) => topN - i)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * totalWeight
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[0]
}

const getPickInfo = (pickNumber, teamCount) => {
  const round = Math.floor(pickNumber / teamCount) + 1
  const pickInRound = pickNumber % teamCount
  const isReverse = round % 2 === 0
  const orderIndex = isReverse ? teamCount - 1 - pickInRound : pickInRound
  return { round, pickInRound, orderIndex }
}

// NFL position-specific stats for popup
const getNflPositionStats = (player) => {
  const pos = player.position
  const stats = []
  if (pos === 'QB') {
    stats.push({ label: 'Pass Yds', value: player.passYards?.toLocaleString() || '0' })
    stats.push({ label: 'Pass TDs', value: player.passTds || 0 })
    stats.push({ label: 'INTs', value: player.interceptions || 0 })
    stats.push({ label: 'Rush Yds', value: player.rushYards?.toLocaleString() || '0' })
    stats.push({ label: 'Rush TDs', value: player.rushTds || 0 })
  } else if (pos === 'RB') {
    stats.push({ label: 'Rush Yds', value: player.rushYards?.toLocaleString() || '0' })
    stats.push({ label: 'Rush TDs', value: player.rushTds || 0 })
    stats.push({ label: 'Rec', value: player.receptions || 0 })
    stats.push({ label: 'Rec Yds', value: player.recYards?.toLocaleString() || '0' })
    stats.push({ label: 'Rec TDs', value: player.recTds || 0 })
    stats.push({ label: 'Targets', value: player.targets || 0 })
  } else if (pos === 'WR' || pos === 'TE') {
    stats.push({ label: 'Rec', value: player.receptions || 0 })
    stats.push({ label: 'Rec Yds', value: player.recYards?.toLocaleString() || '0' })
    stats.push({ label: 'Rec TDs', value: player.recTds || 0 })
    stats.push({ label: 'Targets', value: player.targets || 0 })
    stats.push({ label: 'Rush Yds', value: player.rushYards?.toLocaleString() || '0' })
  }
  return stats
}

// Player detail popup
const PlayerPopup = ({ player, onClose, onDraft, onNominate, onQueue, isUserTurn, isUserNominator, isAuction, inQueue, isDrafted, sport }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!player) return null
  const isNflPopup = sport === 'nfl'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-dark-secondary border border-dark-border rounded-xl max-w-sm w-full shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            {player.headshot ? (
              <img src={player.headshot} alt="" className="w-11 h-11 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
            ) : isNflPopup ? (
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${NFL_POS_COLORS[player.position] || 'bg-dark-tertiary text-text-muted'}`}>
                <span className="text-xs font-bold">{player.position}</span>
              </div>
            ) : (
              <span className="text-2xl">{player.flag}</span>
            )}
            <div>
              <h3 className="text-text-primary font-bold text-lg leading-tight">{player.name}</h3>
              <div className="flex items-center gap-1.5">
                {isNflPopup ? (
                  <>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${NFL_POS_COLORS[player.position] || ''}`}>{player.position}</span>
                    <span className="text-text-muted text-sm">{player.team}</span>
                  </>
                ) : (
                  <>
                    <p className="text-text-muted text-sm">{player.country}</p>
                    {player.primaryTour && (
                      <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                        player.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                        player.primaryTour === 'LIV' ? 'bg-red-500/20 text-red-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>{player.primaryTour}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs font-bold rounded">#{player.rank}</span>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-4">
          {isNflPopup ? (
            <>
              {/* NFL: PPG, Total Pts, Games */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dark-primary rounded-lg p-2 text-center">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">PPG</p>
                  <p className="text-gold text-base font-bold">{player.ppg?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-2 text-center">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Total Pts</p>
                  <p className="text-text-primary text-base font-bold">{player.totalPts?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-2 text-center">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Games</p>
                  <p className="text-text-primary text-base font-bold">{player.gamesPlayed || 0}</p>
                </div>
              </div>
              {/* Position-specific stats */}
              {getNflPositionStats(player).length > 0 && (
                <div>
                  <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">Season Stats</p>
                  <div className={`grid gap-2 ${getNflPositionStats(player).length > 4 ? 'grid-cols-3' : 'grid-cols-' + getNflPositionStats(player).length}`}>
                    {getNflPositionStats(player).map(s => (
                      <div key={s.label} className="bg-dark-primary rounded-lg p-2 text-center">
                        <p className="text-text-muted text-[9px] uppercase tracking-wider mb-0.5">{s.label}</p>
                        <p className="text-text-primary text-sm font-bold">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-dark-primary rounded-lg p-2 text-center">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">SG Total</p>
                  <p className={`text-base font-bold ${player.sg >= 1 ? 'text-gold' : player.sg > 0 ? 'text-text-primary' : 'text-red-400'}`}>
                    {player.sg > 0 ? '+' : ''}{player.sg?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-dark-primary rounded-lg p-2 text-center">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Top 10</p>
                  <p className="text-text-primary text-base font-bold">{player.top10}%</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-2 text-center">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Cuts</p>
                  <p className="text-text-primary text-base font-bold">{player.cutsPct || 0}%</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-2 text-center">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mb-0.5">Events</p>
                  <p className="text-text-primary text-base font-bold">{player.tournaments}</p>
                </div>
              </div>

              {/* SG Breakdown */}
              <div>
                <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">Strokes Gained</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'OTT', value: player.sgOTT },
                    { label: 'APP', value: player.sgAPP },
                    { label: 'ATG', value: player.sgATG },
                    { label: 'Putt', value: player.sgPutt },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-text-muted text-xs w-8 text-right">{label}</span>
                      <div className="flex-1 h-1.5 bg-dark-primary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${value >= 0 ? 'bg-gold' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, Math.abs(value) / 1.0 * 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium w-11 text-right tabular-nums ${value > 0.3 ? 'text-gold' : value >= 0 ? 'text-text-primary' : 'text-red-400'}`}>
                        {value > 0 ? '+' : ''}{value?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Form */}
              {player.form?.length > 0 && (
                <div>
                  <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">Recent Form</p>
                  <div className="flex gap-1.5">
                    {player.form.map((result, i) => {
                      const pos = parseInt(result.replace('T', ''))
                      return (
                        <span key={i} className={`flex-1 text-center py-1.5 rounded text-xs font-medium ${
                          result === '1' ? 'bg-yellow-500/20 text-yellow-400' :
                          result === 'CUT' ? 'bg-red-500/15 text-red-400' :
                          pos <= 5 ? 'bg-gold/20 text-gold' :
                          pos <= 15 ? 'bg-emerald-500/10 text-emerald-400/70' :
                          pos <= 30 ? 'bg-dark-tertiary text-text-secondary' :
                          'bg-dark-tertiary text-text-muted'
                        }`}>
                          {result === '1' ? '1st' : result}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!isDrafted && (
          <div className="flex gap-2 p-4 pt-0">
            <button
              onClick={() => { onQueue(player); onClose() }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                inQueue
                  ? 'bg-orange/20 text-orange border border-orange/30'
                  : 'bg-dark-primary text-text-primary hover:bg-dark-tertiary border border-dark-border'
              }`}
            >
              {inQueue ? 'Queued' : 'Add to Queue'}
            </button>
            {isAuction ? (
              isUserNominator && (
                <button
                  onClick={() => { onNominate(player); onClose() }}
                  className="flex-1 py-2.5 bg-yellow-500 text-slate rounded-lg text-sm font-bold hover:bg-yellow-400 transition-colors"
                >
                  Nominate
                </button>
              )
            ) : (
              isUserTurn && (
                <button
                  onClick={() => { onDraft(player); onClose() }}
                  className="flex-1 py-2.5 bg-gold text-text-primary rounded-lg text-sm font-bold hover:bg-gold/90 transition-colors"
                >
                  Draft Now
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// AI draft chat flavor messages
const GOLF_DRAFT_CHAT = {
  pick: [
    (n) => `${n} 🔥`,
    (n) => `Surprised ${n} was still there`,
    (n) => `Good pick, ${n} is underrated`,
    (n) => `${n}? Bold.`,
    (n) => `I wanted ${n}!`,
    (n) => `Nice, ${n} was on my board`,
    (n) => `${n} is going to ball out this year`,
    (n) => `Steal of the draft right there`,
  ],
  general: [
    'Let\'s go! 🏌️',
    'This draft is moving quick ⚡',
    'My team is looking solid 💪',
    'Some steals being made here',
    'GL everyone',
    'This is fun',
    'Who\'s everyone targeting?',
  ],
}

const NFL_DRAFT_CHAT = {
  pick: [
    (n) => `${n} 🔥 steal!`,
    (n) => `Surprised ${n} was still on the board`,
    (n) => `${n}? Bold move.`,
    (n) => `I had ${n} next on my list!`,
    (n) => `${n} is gonna eat this season`,
    (n) => `Nice grab, ${n} is a target monster`,
    (n) => `Sleeper SZN with ${n}`,
    (n) => `${n} was my guy, smh`,
  ],
  general: [
    'Who needs a QB? 🏈',
    'Zero RB strategy all day',
    'My WR room is stacked 💪',
    'RB dead zone is real',
    'TE premium league vibes',
    'Handcuff SZN',
    'Who\'s everyone targeting in the mid rounds?',
    'Don\'t sleep on the rookie class',
  ],
}

const SPEED_CONFIG = {
  normal:  { aiDelay: 800, aiJitter: 400, toastDuration: 2000 },
  fast:    { aiDelay: 250, aiJitter: 150, toastDuration: 1200 },
  instant: { aiDelay: 40,  aiJitter: 20,  toastDuration: 600  },
}

const MockDraftRoom = () => {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [picks, setPicks] = useState([])
  const [queue, setQueue] = useState([])
  const [timer, setTimer] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [recentPick, setRecentPick] = useState(null)
  const [pickTagPrompt, setPickTagPrompt] = useState(null) // { pickId, playerName }
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('board') // board, players, queue, myteam, chat
  const [bottomTab, setBottomTab] = useState('queue') // queue, myteam, picks, chat
  const [sortBy, setSortBy] = useState('rank') // rank, name, sg, top10
  const [sortDir, setSortDir] = useState('asc')
  const [showDrafted, setShowDrafted] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [apiPlayers, setApiPlayers] = useState(null)
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [draftSpeed, setDraftSpeed] = useState('fast')
  const timerRef = useRef(null)
  const boardRef = useRef(null)
  const chatEndRef = useRef(null)
  const picksRef = useRef([])
  const queueRef = useRef([])
  const allPlayersRef = useRef([])
  const boardEntriesRef = useRef([])
  const draftSpeedRef = useRef('fast')

  // Auction draft state
  const [auctionPhase, setAuctionPhase] = useState('nominating') // 'nominating' | 'bidding'
  const [budgets, setBudgets] = useState({})
  const [nominatorIndex, setNominatorIndex] = useState(0)
  const [currentNom, setCurrentNom] = useState(null) // { player, currentBid, highBidderTeamId }
  const [nomBidInput, setNomBidInput] = useState(1)
  const [nomExpanded, setNomExpanded] = useState(false)
  const auctionPhaseRef = useRef('nominating')
  const currentNomRef = useRef(null)
  const budgetsRef = useRef({})
  const nominatorIndexRef = useRef(0)
  const nominateRef = useRef(null)
  const placeBidRef = useRef(null)
  const awardPlayerRef = useRef(null)

  // Sound effects
  const { soundEnabled, toggleSound, initSounds, playPick, playYourTurn, playTimerWarning, playDraftStart, playBid, playDraftComplete } = useDraftSounds()

  // Auto-pick
  const [autoPick, setAutoPick] = useState(() => sessionStorage.getItem('mockDraftAutoPick') === 'true')
  const autoPickRef = useRef(autoPick)
  const [autoPickCountdown, setAutoPickCountdown] = useState(0)
  const autoPickCountdownRef = useRef(null)

  // Board integration
  const [boardEntries, setBoardEntries] = useState([])
  const [tierAlert, setTierAlert] = useState(null)
  const boardQueueInitRef = useRef(false)

  // AI Coach nudge
  const [draftNudge, setDraftNudge] = useState(null)

  // Load config
  useEffect(() => {
    const stored = sessionStorage.getItem('mockDraftConfig')
    if (!stored) {
      navigate('/mock-draft')
      return
    }
    setConfig(JSON.parse(stored))
  }, [navigate])

  // Load board entries if boardId is set
  useEffect(() => {
    if (!config?.boardId) return
    api.getDraftBoard(config.boardId)
      .then(data => {
        const entries = data.board?.entries || []
        setBoardEntries(entries.sort((a, b) => a.rank - b.rank))
      })
      .catch(() => setBoardEntries([]))
  }, [config])

  // Fetch real player data from API (falls back to MOCK_PLAYERS/MOCK_NFL_PLAYERS if unavailable)
  useEffect(() => {
    if (!config) return
    const fetchPlayers = async () => {
      try {
        if (config.sport === 'nfl') {
          const data = await api.getNflPlayers({ limit: 300, sortBy: 'fantasyPts', sortOrder: 'desc', scoring: config.scoring || 'half_ppr' })
          const players = data?.players
          if (Array.isArray(players) && players.length > 0) {
            setApiPlayers(players.map((p, i) => ({
              id: p.id,
              name: p.name,
              rank: i + 1,
              position: p.nflPosition || 'WR',
              team: p.nflTeamAbbr || '',
              ppg: p.fantasyPtsPerGame || 0,
              totalPts: p.fantasyPts || 0,
              gamesPlayed: p.season?.gamesPlayed || 0,
              headshot: p.headshotUrl || null,
              passYards: p.season?.passingYards || 0,
              passTds: p.season?.passingTds || 0,
              interceptions: p.season?.interceptions || 0,
              rushYards: p.season?.rushingYards || 0,
              rushTds: p.season?.rushingTds || 0,
              receptions: p.season?.receptions || 0,
              recYards: p.season?.receivingYards || 0,
              recTds: p.season?.receivingTds || 0,
              targets: p.season?.targets || 0,
            })))
          }
        } else {
          const data = await api.getPlayers({ limit: 300, sortBy: 'owgrRank', sortOrder: 'asc' })
          const players = data?.players
          if (Array.isArray(players) && players.length > 0) {
            setApiPlayers(players.map(p => ({
              id: p.id,
              name: p.name,
              rank: p.owgrRank || 999,
              country: p.country || 'Unknown',
              flag: p.countryFlag || '🏳️',
              primaryTour: p.primaryTour || null,
              sg: p.sgTotal || 0,
              sgOTT: p.sgOffTee || 0,
              sgAPP: p.sgApproach || 0,
              sgATG: p.sgAroundGreen || 0,
              sgPutt: p.sgPutting || 0,
              top10: p.events > 0 ? Math.round((p.top10s || 0) / p.events * 100) : 0,
              cutsPct: p.events > 0 ? Math.round((p.cutsMade || 0) / p.events * 100) : 0,
              tournaments: p.events || 0,
              form: p.recentForm || [],
              headshot: p.headshotUrl || null,
              wins: p.wins || 0,
              top5s: p.top5s || 0,
              top10s: p.top10s || 0,
              top25s: p.top25s || 0,
              cutsMade: p.cutsMade || 0,
              earnings: p.earnings || 0,
            })))
          }
        }
      } catch (err) {
        console.warn('Mock draft: using offline player data', err)
      } finally {
        setLoadingPlayers(false)
      }
    }
    fetchPlayers()
  }, [config])

  const isNfl = config?.sport === 'nfl'

  // Use real API data if available, otherwise fall back to enriched mock data
  const allPlayers = useMemo(() => {
    if (apiPlayers) return apiPlayers
    // NFL fallback
    if (config?.sport === 'nfl') return MOCK_NFL_PLAYERS
    // Golf fallback: compute stats from MOCK_PLAYERS
    return MOCK_PLAYERS.map(p => {
      const r = p.rank
      const variance = Math.sin(r * 1.7) * 0.25
      const sgOTT = +(p.sg * 0.28 + variance).toFixed(2)
      const sgAPP = +(p.sg * 0.35 - variance * 0.5).toFixed(2)
      const sgATG = +(p.sg * 0.18 + Math.cos(r * 2.3) * 0.12).toFixed(2)
      const sgPutt = +(p.sg - sgOTT - sgAPP - sgATG).toFixed(2)
      const top10 = Math.max(8, Math.round(65 - r * 0.95 + Math.sin(r * 0.7) * 6))
      const cutsPct = Math.max(50, Math.min(95, Math.round(90 - r * 0.6 + Math.sin(r * 2.1) * 8)))
      const form = Array.from({ length: 5 }, (_, i) => {
        const seed = Math.sin(r * 13 + i * 7) * 10000
        const val = Math.abs(Math.round(seed % 100))
        if (r > 35 && val > 70) return 'CUT'
        if (r > 20 && val > 85) return 'CUT'
        const base = Math.max(1, Math.round(r * 0.5 + (val % 20) - 5))
        if (base <= 1 && r <= 5) return '1'
        return base <= 1 ? 'T2' : `T${Math.min(base, 65)}`
      })
      const tournaments = Math.max(15, Math.min(30, Math.round(20 + r * 0.12 + Math.sin(r * 3.1) * 3)))
      const winsEst = r <= 3 ? 2 : r <= 10 ? 1 : 0
      const top5sEst = Math.max(0, Math.round(tournaments * Math.max(0, (40 - r) / 100)))
      const top10sEst = Math.round(tournaments * top10 / 100)
      const top25sEst = Math.round(tournaments * Math.min(80, top10 + 25) / 100)
      const cutsMadeEst = Math.round(tournaments * cutsPct / 100)
      return { ...p, sgOTT, sgAPP, sgATG, sgPutt, top10, cutsPct, form, tournaments, headshot: null, wins: winsEst, top5s: top5sEst, top10s: top10sEst, top25s: top25sEst, cutsMade: cutsMadeEst, earnings: 0 }
    })
  }, [apiPlayers, config])

  // Board lookup — maps player IDs and names to board entries
  const boardLookup = useMemo(() => {
    const byId = new Map()
    const byName = new Map()
    for (const e of boardEntries) {
      byId.set(e.playerId, e)
      if (e.player?.name) byName.set(e.player.name.toLowerCase(), e)
    }
    return { byId, byName }
  }, [boardEntries])

  const getBoardEntry = useCallback((player) => {
    return boardLookup.byId.get(player.id) || boardLookup.byName.get(player.name?.toLowerCase())
  }, [boardLookup])

  // Pre-populate queue from board entries (once)
  useEffect(() => {
    if (boardQueueInitRef.current || boardEntries.length === 0 || allPlayers.length === 0 || isStarted) return
    boardQueueInitRef.current = true
    const boardQueue = []
    for (const entry of boardEntries) {
      const player = allPlayers.find(p =>
        p.id === entry.playerId || p.name?.toLowerCase() === entry.player?.name?.toLowerCase()
      )
      if (player) boardQueue.push(player)
    }
    if (boardQueue.length > 0) {
      setQueue(boardQueue)
      queueRef.current = boardQueue
    }
  }, [boardEntries, allPlayers, isStarted])

  // Keep allPlayers ref in sync for timer/AI callbacks
  allPlayersRef.current = allPlayers
  draftSpeedRef.current = draftSpeed

  const totalPicks = config ? config.teamCount * config.rosterSize : 0
  const draftedIds = picks.map(p => p.playerId)
  const availablePlayers = allPlayers.filter(p => !draftedIds.includes(p.id))

  // Current pick info
  const currentPickNumber = picks.length
  const pickInfo = config ? getPickInfo(currentPickNumber, config.teamCount) : null
  const isAuction = config?.draftType === 'auction'
  const currentTeam = isAuction
    ? (config?.teams ? config.teams[nominatorIndex % config.teamCount] : null)
    : config?.teams?.[pickInfo?.orderIndex]
  const isUserTurn = !isAuction && currentTeam?.isUser && isStarted && !isComplete
  const nominatorTeam = isAuction && config?.teams ? config.teams[nominatorIndex % config.teamCount] : null
  const isUserNominator = isAuction && nominatorTeam?.isUser && isStarted && !isComplete && auctionPhase === 'nominating'
  const userTeamId = config?.teams?.find(t => t.isUser)?.id
  const isUserBidding = isAuction && auctionPhase === 'bidding' && currentNom && currentNom.highBidderTeamId !== userTeamId

  // NFL position filter
  const [posFilter, setPosFilter] = useState('ALL')

  // Sort and filter players
  const filteredPlayers = useMemo(() => {
    let result = showDrafted ? allPlayers.map(p => ({ ...p, isDrafted: draftedIds.includes(p.id) })) : availablePlayers.map(p => ({ ...p, isDrafted: false }))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.country && p.country.toLowerCase().includes(q)) ||
        (p.position && p.position.toLowerCase().includes(q)) ||
        (p.team && p.team.toLowerCase().includes(q))
      )
    }
    if (isNfl && posFilter !== 'ALL') {
      result = result.filter(p => p.position === posFilter)
    }
    result.sort((a, b) => {
      // When showing drafted, push drafted players to the bottom
      if (showDrafted && a.isDrafted !== b.isDrafted) return a.isDrafted ? 1 : -1
      let aVal, bVal
      if (sortBy === 'name') { aVal = a.name; bVal = b.name }
      else if (sortBy === 'sg') { aVal = a.sg; bVal = b.sg }
      else if (sortBy === 'top10') { aVal = a.top10; bVal = b.top10 }
      else if (sortBy === 'ppg') { aVal = a.ppg; bVal = b.ppg }
      else if (sortBy === 'totalPts') { aVal = a.totalPts; bVal = b.totalPts }
      else { aVal = a.rank; bVal = b.rank }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return result
  }, [availablePlayers, allPlayers, draftedIds, showDrafted, searchQuery, sortBy, sortDir, isNfl, posFilter])

  // Stable ref for makePick to avoid stale closures in timers
  const makePickRef = useRef(null)

  const handleMakePick = useCallback((player) => {
    if (!config) return

    clearInterval(timerRef.current)
    playPick()

    setPicks(prev => {
      const pickNumber = prev.length
      const info = getPickInfo(pickNumber, config.teamCount)
      const team = config.teams[info.orderIndex]
      const isUserPick = team.isUser

      // Auto-lookup board rank if user has board entries loaded
      let boardRank = null
      if (isUserPick && boardEntriesRef?.current?.length > 0) {
        const entry = boardEntriesRef.current.find(e =>
          e.playerId === player.id || (e.playerName || '').toLowerCase() === (player.name || '').toLowerCase()
        )
        if (entry) boardRank = entry.rank
      }

      const pick = {
        id: `pick-${pickNumber + 1}`,
        pickNumber: pickNumber + 1,
        round: info.round,
        teamId: team.id,
        teamName: team.name,
        playerId: player.id,
        playerName: player.name,
        playerFlag: player.flag,
        playerRank: player.rank,
        playerPosition: player.position || null,
        playerTeam: player.team || null,
        pickTag: null,
        boardRankAtPick: boardRank,
      }

      setRecentPick(pick)
      setTimeout(() => setRecentPick(null), SPEED_CONFIG[draftSpeedRef.current].toastDuration)

      // Show pick tag prompt for user picks
      if (isUserPick) {
        setPickTagPrompt({ pickId: pick.id, playerName: player.name })
        setTimeout(() => setPickTagPrompt(prev => prev?.pickId === pick.id ? null : prev), 8000)
      }

      const newPicks = [...prev, pick]
      if (newPicks.length >= config.teamCount * config.rosterSize) {
        setIsComplete(true)
      }

      return newPicks
    })

    setQueue(prev => prev.filter(q => q.id !== player.id))
  }, [config, playPick])

  // Handle tagging a draft pick
  const handlePickTag = useCallback((tag) => {
    if (!pickTagPrompt) return
    setPicks(prev => prev.map(p =>
      p.id === pickTagPrompt.pickId ? { ...p, pickTag: tag } : p
    ))
    setPickTagPrompt(null)
  }, [pickTagPrompt])

  // Auction: nominate a player with a starting bid
  const handleNominate = useCallback((player, startBid) => {
    if (auctionPhaseRef.current !== 'nominating') return
    const bid = Math.max(1, startBid || 1)
    const nomTeam = config.teams[nominatorIndexRef.current % config.teamCount]
    const nom = { player, currentBid: bid, highBidderTeamId: nomTeam.id, nominatedByTeamId: nomTeam.id }
    setCurrentNom(nom)
    currentNomRef.current = nom
    setAuctionPhase('bidding')
    auctionPhaseRef.current = 'bidding'
    setTimer(15)
    setNomBidInput(bid + 1)
  }, [config])

  // Auction: place a bid
  const handlePlaceBid = useCallback((amount, teamId) => {
    if (auctionPhaseRef.current !== 'bidding' || !currentNomRef.current) return
    const nom = currentNomRef.current
    if (amount <= nom.currentBid) return
    const bTeamId = teamId || userTeamId
    if (!bTeamId || budgetsRef.current[bTeamId] < amount) return
    if (nom.highBidderTeamId === bTeamId) return
    const updated = { ...nom, currentBid: amount, highBidderTeamId: bTeamId }
    setCurrentNom(updated)
    currentNomRef.current = updated
    setTimer(15)
    setNomBidInput(amount + 1)
    playBid()
  }, [userTeamId, playBid])

  // Auction: award current nomination to highest bidder
  const handleAwardPlayer = useCallback(() => {
    const nom = currentNomRef.current
    if (!nom || !config) return
    clearInterval(timerRef.current)
    playPick()
    setBudgets(prev => {
      const updated = { ...prev, [nom.highBidderTeamId]: prev[nom.highBidderTeamId] - nom.currentBid }
      budgetsRef.current = updated
      return updated
    })
    setPicks(prev => {
      const pickNumber = prev.length
      const team = config.teams.find(t => t.id === nom.highBidderTeamId)
      const isUserWin = team?.isUser

      // Auto-lookup board rank
      let boardRank = null
      if (isUserWin && boardEntriesRef?.current?.length > 0) {
        const entry = boardEntriesRef.current.find(e =>
          e.playerId === nom.player.id || (e.playerName || '').toLowerCase() === (nom.player.name || '').toLowerCase()
        )
        if (entry) boardRank = entry.rank
      }

      const pick = {
        id: `pick-${pickNumber + 1}`,
        pickNumber: pickNumber + 1,
        round: Math.ceil((pickNumber + 1) / config.teamCount),
        teamId: nom.highBidderTeamId,
        teamName: team?.name || 'Unknown',
        playerId: nom.player.id,
        playerName: nom.player.name,
        playerFlag: nom.player.flag,
        playerRank: nom.player.rank,
        playerPosition: nom.player.position || null,
        playerTeam: nom.player.team || null,
        amount: nom.currentBid,
        pickTag: null,
        boardRankAtPick: boardRank,
      }
      setRecentPick(pick)
      setTimeout(() => setRecentPick(null), SPEED_CONFIG[draftSpeedRef.current].toastDuration)

      // Show pick tag prompt for user picks
      if (isUserWin) {
        setPickTagPrompt({ pickId: pick.id, playerName: nom.player.name })
        setTimeout(() => setPickTagPrompt(prev => prev?.pickId === pick.id ? null : prev), 8000)
      }
      const newPicks = [...prev, pick]
      if (newPicks.length >= config.teamCount * config.rosterSize) {
        setIsComplete(true)
      }
      return newPicks
    })
    setQueue(prev => prev.filter(q => q.id !== nom.player.id))
    setCurrentNom(null)
    currentNomRef.current = null
    setNomExpanded(false)
    setAuctionPhase('nominating')
    auctionPhaseRef.current = 'nominating'
    setNominatorIndex(prev => {
      const next = (prev + 1) % config.teamCount
      nominatorIndexRef.current = next
      return next
    })
  }, [config, playPick])

  // Keep refs in sync
  makePickRef.current = handleMakePick
  picksRef.current = picks
  queueRef.current = queue
  boardEntriesRef.current = boardEntries
  auctionPhaseRef.current = auctionPhase
  currentNomRef.current = currentNom
  budgetsRef.current = budgets
  nominatorIndexRef.current = nominatorIndex
  nominateRef.current = handleNominate
  placeBidRef.current = handlePlaceBid
  awardPlayerRef.current = handleAwardPlayer
  autoPickRef.current = autoPick

  // Sound: your turn alert
  const prevIsUserTurnRef = useRef(false)
  const prevIsUserNominatorRef = useRef(false)
  useEffect(() => {
    if (isUserTurn && !prevIsUserTurnRef.current) playYourTurn()
    prevIsUserTurnRef.current = isUserTurn
  }, [isUserTurn, playYourTurn])
  useEffect(() => {
    if (isUserNominator && !prevIsUserNominatorRef.current) playYourTurn()
    prevIsUserNominatorRef.current = isUserNominator
  }, [isUserNominator, playYourTurn])

  // AI Coach nudge — fetch when it's user's turn
  useEffect(() => {
    if (!isUserTurn || !isStarted || isComplete) { setDraftNudge(null); return }
    const userTeamLocal = config?.teams?.find(t => t.isUser)
    const userPicksLocal = userTeamLocal ? picks.filter(p => p.teamId === userTeamLocal.id) : []
    const positionsDrafted = {}
    for (const p of userPicksLocal) {
      const pos = p.playerPosition || 'UNKNOWN'
      positionsDrafted[pos] = (positionsDrafted[pos] || 0) + 1
    }
    api.getDraftNudge({
      sport: config?.sport || 'golf',
      picksSoFar: userPicksLocal.length,
      positionsDrafted,
      boardPlayersAvailable: boardEntries.filter(e => !picks.some(p => p.playerId === e.playerId)).length,
    }).then(res => {
      if (res.nudge?.nudgeText) setDraftNudge(res.nudge)
    }).catch(() => {})
  }, [isUserTurn, isStarted, isComplete, currentPickNumber])

  // Sound + tracking: draft complete
  const prevIsCompleteRef = useRef(false)
  useEffect(() => {
    if (isComplete && !prevIsCompleteRef.current) {
      playDraftComplete()
      track(Events.MOCK_DRAFT_COMPLETED, { draftType: config?.draftType, teams: config?.teams?.length })
    }
    prevIsCompleteRef.current = isComplete
  }, [isComplete, playDraftComplete, config])

  // Tier depletion alerts — fires when a board tier is nearly or fully depleted
  const prevPickCountRef = useRef(0)
  useEffect(() => {
    if (boardEntries.length === 0 || picks.length === 0 || picks.length === prevPickCountRef.current) return
    prevPickCountRef.current = picks.length
    const lastPick = picks[picks.length - 1]
    const draftedEntry = boardEntries.find(e =>
      e.playerId === lastPick.playerId ||
      e.player?.name?.toLowerCase() === lastPick.playerName?.toLowerCase()
    )
    if (!draftedEntry?.tier) return
    const tier = draftedEntry.tier
    const tierEntries = boardEntries.filter(e => e.tier === tier)
    if (tierEntries.length <= 1) return // single-player tiers don't alert
    const draftedSet = new Set(picks.map(p => p.playerId))
    const draftedNames = new Set(picks.map(p => p.playerName?.toLowerCase()))
    const availableInTier = tierEntries.filter(e =>
      !draftedSet.has(e.playerId) && !draftedNames.has(e.player?.name?.toLowerCase())
    )
    if (availableInTier.length <= 1 && availableInTier.length < tierEntries.length - 1) {
      const msg = availableInTier.length === 0
        ? `Tier ${tier} depleted!`
        : `Tier ${tier}: only ${availableInTier.length} player left!`
      setTierAlert(msg)
      setTimeout(() => setTierAlert(null), 4000)
    }
  }, [picks, boardEntries])

  // Auto-pick: snake — immediately pick after short delay when it's user's turn
  useEffect(() => {
    if (!autoPickRef.current || !isUserTurn || !isStarted || isPaused || isComplete) return
    const timeout = setTimeout(() => {
      if (!autoPickRef.current) return
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const queuePick = queueRef.current.find(q => !draftedSet.has(q.id))
      if (queuePick) {
        makePickRef.current?.(queuePick)
      } else {
        const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
        if (best) makePickRef.current?.(best)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [isUserTurn, isStarted, isPaused, isComplete, currentPickNumber])

  // Auto-pick: auction nomination — auto-nominate when it's user's turn to nominate
  useEffect(() => {
    if (!autoPickRef.current || !isUserNominator || !isStarted || isPaused || isComplete) return
    const timeout = setTimeout(() => {
      if (!autoPickRef.current || auctionPhaseRef.current !== 'nominating') return
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const queuePick = queueRef.current.find(q => !draftedSet.has(q.id))
      if (queuePick) {
        nominateRef.current?.(queuePick, 1)
      } else {
        const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
        if (best) nominateRef.current?.(best, 1)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [isUserNominator, isStarted, isPaused, isComplete])

  // Universal pick timer — handles snake picks and auction nomination/bidding phases
  useEffect(() => {
    if (!isStarted || isPaused || isComplete) return

    if (isAuction) {
      if (auctionPhase === 'bidding') {
        // Bidding countdown — timer was set to 15 by handleNominate/handlePlaceBid
        timerRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current)
              awardPlayerRef.current?.()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        // Nomination phase countdown
        setTimer(config?.pickTimer || 30)
        timerRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current)
              // Auto-nominate for user if they time out
              const nomTeam = config.teams[nominatorIndexRef.current % config.teamCount]
              if (nomTeam?.isUser) {
                const draftedSet = new Set(picksRef.current.map(p => p.playerId))
                const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
                if (best) nominateRef.current?.(best, 1)
              }
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } else {
      // Snake draft timer — short timer for AI turns as safety net
      setTimer(isUserTurn ? (config?.pickTimer || 90) : 8)
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            // Auto-pick: user timeout OR AI fallback (AI effect should have picked, this is safety net)
            const draftedSet = new Set(picksRef.current.map(p => p.playerId))
            if (isUserTurn) {
              const queuePick = queueRef.current.find(q => !draftedSet.has(q.id))
              if (queuePick) {
                makePickRef.current?.(queuePick)
              } else {
                const best = allPlayersRef.current.find(p => !draftedSet.has(p.id))
                if (best) makePickRef.current?.(best)
              }
            } else {
              // AI safety net: force pick if AI effect didn't fire
              const available = allPlayersRef.current.filter(p => !draftedSet.has(p.id))
              if (available.length > 0) {
                const info = getPickInfo(picksRef.current.length, config.teamCount)
                const team = config.teams[info.orderIndex]
                const teamPicks = picksRef.current.filter(p => p.teamId === team?.id)
                const selected = aiSelectPlayer(available, teamPicks, config?.sport)
                if (selected) makePickRef.current?.(selected)
              }
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(timerRef.current)
  }, [isUserTurn, isStarted, isPaused, isComplete, currentPickNumber, isAuction, auctionPhase])

  // Sound: timer warning ticks every second from 10 down to 1 when it's user's action
  useEffect(() => {
    if (timer >= 1 && timer <= 10 && isStarted && !isPaused && (isUserTurn || isUserNominator || (isAuction && auctionPhase === 'bidding'))) {
      playTimerWarning(timer)
    }
  }, [timer, isStarted, isPaused, isUserTurn, isUserNominator, isAuction, auctionPhase, playTimerWarning])

  // Snake AI picks — cleanup-based cancellation (no ref guard needed)
  useEffect(() => {
    if (isAuction) return
    if (!isStarted || isPaused || isComplete || isUserTurn) return
    if (!config || currentPickNumber >= totalPicks) return

    const speedCfg = SPEED_CONFIG[draftSpeedRef.current]
    const aiDelay = speedCfg.aiDelay + Math.random() * speedCfg.aiJitter
    const timeout = setTimeout(() => {
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const available = allPlayersRef.current.filter(p => !draftedSet.has(p.id))
      if (available.length === 0) return

      const info = getPickInfo(picksRef.current.length, config.teamCount)
      const team = config.teams[info.orderIndex]
      const teamPicks = picksRef.current.filter(p => p.teamId === team?.id)
      const selected = aiSelectPlayer(available, teamPicks, config.sport)
      if (selected) makePickRef.current?.(selected)
    }, aiDelay)

    return () => clearTimeout(timeout)
  }, [currentPickNumber, isStarted, isPaused, isComplete, isUserTurn, config, totalPicks, isAuction])

  // Auction AI: auto-nominate when it's an AI team's turn
  useEffect(() => {
    if (!isAuction || !isStarted || isPaused || isComplete) return
    if (auctionPhase !== 'nominating') return
    if (nominatorTeam?.isUser) return

    const speedCfg = SPEED_CONFIG[draftSpeedRef.current]
    const delay = speedCfg.aiDelay + Math.random() * speedCfg.aiJitter
    const timeout = setTimeout(() => {
      if (auctionPhaseRef.current !== 'nominating') return
      const draftedSet = new Set(picksRef.current.map(p => p.playerId))
      const available = allPlayersRef.current.filter(p => !draftedSet.has(p.id))
      if (available.length === 0) return
      const teamPicks = picksRef.current.filter(p => p.teamId === nominatorTeam?.id)
      const player = aiSelectPlayer(available, teamPicks, config?.sport)
      if (player) nominateRef.current?.(player, 1)
    }, delay)

    return () => clearTimeout(timeout)
  }, [isAuction, isStarted, isPaused, isComplete, auctionPhase, nominatorTeam, nominatorIndex, config])

  // Auction AI: evaluate bids from AI teams after each nomination/bid
  useEffect(() => {
    if (!isAuction || !isStarted || isPaused || isComplete) return
    if (auctionPhase !== 'bidding' || !currentNom) return

    const speedCfg = SPEED_CONFIG[draftSpeedRef.current]
    const timeouts = []

    config.teams.forEach(team => {
      if (team.isUser) return
      if (team.id === currentNom.highBidderTeamId) return

      const budget = budgetsRef.current[team.id] || 0
      const teamPicks = picksRef.current.filter(p => p.teamId === team.id)
      const remainingSlots = config.rosterSize - teamPicks.length
      if (remainingSlots <= 0 || budget <= currentNom.currentBid) return

      const fairValue = Math.max(2, Math.round(budget / remainingSlots))
      const rank = currentNom.player?.rank || 50
      const playerValue = Math.max(2, Math.round(fairValue * (1 + Math.max(0, 50 - rank) / 80)))
      if (currentNom.currentBid >= playerValue) return

      const bidChance = Math.min(0.7, 0.5 * (1 - currentNom.currentBid / playerValue))
      if (Math.random() > bidChance) return

      const bidAmount = Math.min(
        currentNom.currentBid + Math.ceil(Math.random() * 3),
        playerValue,
        budget
      )
      if (bidAmount <= currentNom.currentBid) return

      const delay = speedCfg.aiDelay * 3 + Math.random() * 4000
      const timeout = setTimeout(() => {
        if (auctionPhaseRef.current !== 'bidding') return
        const nom = currentNomRef.current
        if (!nom || nom.highBidderTeamId === team.id) return
        if (bidAmount <= nom.currentBid) return
        if (budgetsRef.current[team.id] < bidAmount) return
        placeBidRef.current?.(bidAmount, team.id)
      }, delay)
      timeouts.push(timeout)
    })

    return () => timeouts.forEach(t => clearTimeout(t))
  }, [isAuction, isStarted, isPaused, isComplete, auctionPhase, currentNom, config])

  const handleStartDraft = () => {
    initSounds()
    playDraftStart()
    track(Events.MOCK_DRAFT_STARTED, { draftType: config?.draftType, teams: config?.teams?.length, rosterSize: config?.rosterSize })
    setIsStarted(true)
    setIsPaused(false)
    if (config?.draftType === 'auction') {
      const initialBudgets = {}
      config.teams.forEach(t => { initialBudgets[t.id] = t.budget || 100 })
      setBudgets(initialBudgets)
      budgetsRef.current = initialBudgets
    }
  }

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => {
      if (!prev) {
        clearInterval(timerRef.current)
      }
      return !prev
    })
  }, [])

  // Spacebar toggles pause/resume
  useEffect(() => {
    if (!isStarted || isComplete) return
    const handler = (e) => {
      if (e.code !== 'Space') return
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      e.preventDefault()
      handleTogglePause()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isStarted, isComplete, handleTogglePause])

  const handleAddToQueue = (player) => {
    setQueue(prev => {
      if (prev.find(q => q.id === player.id)) return prev
      return [...prev, player]
    })
  }

  const handleRemoveFromQueue = (playerId) => {
    setQueue(prev => prev.filter(q => q.id !== playerId))
  }

  // Chat
  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      sender: 'You',
      text: chatInput.trim(),
      isUser: true,
    }])
    setChatInput('')
  }, [chatInput])

  // AI chat messages on picks
  useEffect(() => {
    if (picks.length === 0 || !config) return
    const lastPick = picks[picks.length - 1]
    if (lastPick.teamId === config.teams.find(t => t.isUser)?.id) return
    // Reduce chat frequency at instant speed to avoid flooding
    const chatChance = draftSpeedRef.current === 'instant' ? 0.10 : 0.35
    if (Math.random() > chatChance) return

    const chatObj = config.sport === 'nfl' ? NFL_DRAFT_CHAT : GOLF_DRAFT_CHAT
    const templates = Math.random() > 0.25 ? chatObj.pick : chatObj.general
    const msg = typeof templates[0] === 'function'
      ? templates[Math.floor(Math.random() * templates.length)](lastPick.playerName.split(' ').pop())
      : templates[Math.floor(Math.random() * templates.length)]
    const otherTeams = config.teams.filter(t => !t.isUser && t.id !== lastPick.teamId)
    const sender = otherTeams[Math.floor(Math.random() * otherTeams.length)]

    const chatDelay = draftSpeedRef.current === 'instant' ? 50 : 600 + Math.random() * 2000
    const delay = setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `msg-ai-${Date.now()}`,
        sender: sender?.name || 'Team',
        text: msg,
        isUser: false,
      }])
    }, chatDelay)
    return () => clearTimeout(delay)
  }, [picks.length, config])

  // Welcome message on draft start
  useEffect(() => {
    if (isStarted) {
      setChatMessages([{
        id: 'msg-welcome',
        sender: 'System',
        text: config?.sport === 'nfl' ? 'Draft has started! Good luck everyone 🏈' : 'Draft has started! Good luck everyone 🏌️',
        isSystem: true,
      }])
    }
  }, [isStarted, config])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'sg' || field === 'top10' || field === 'ppg' || field === 'totalPts' ? 'desc' : 'asc')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTeamPicks = (teamId) => picks.filter(p => p.teamId === teamId)
  const userTeam = config?.teams?.find(t => t.isUser)
  const userPicks = userTeam ? getTeamPicks(userTeam.id) : []

  // Auto-scroll board to current pick
  useEffect(() => {
    if (boardRef.current && isStarted && pickInfo) {
      const rows = boardRef.current.querySelectorAll('[data-round]')
      const currentRow = rows[pickInfo.round - 1]
      if (currentRow) {
        currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [currentPickNumber, isStarted])

  // Draft Complete — save to backend and redirect to recap
  useEffect(() => {
    if (!isComplete || !config) return

    const userTeamLocal = config.teams?.find(t => t.isUser)

    // Build data for save
    const allPicksData = picks.map(p => ({
      pickNumber: p.pickNumber,
      round: p.round,
      teamIndex: config.teams.findIndex(t => t.id === p.teamId),
      teamName: config.teams.find(t => t.id === p.teamId)?.name || '',
      playerId: p.playerId || p.id,
      playerName: p.playerName,
      playerRank: p.playerRank,
      playerPosition: p.playerPosition || null,
      playerTeam: p.playerTeam || null,
      isUser: p.teamId === userTeamLocal?.id,
    }))

    const userPicksLocal = userTeamLocal ? picks.filter(p => p.teamId === userTeamLocal.id) : []
    const userPicksData = userPicksLocal.map(p => ({
      pickNumber: p.pickNumber,
      round: p.round,
      playerId: p.playerId || p.id,
      playerName: p.playerName,
      playerRank: p.playerRank,
      playerFlag: p.playerFlag,
      playerPosition: p.playerPosition || null,
      playerTeam: p.playerTeam || null,
      pickTag: p.pickTag || null,
      boardRankAtPick: p.boardRankAtPick || null,
    }))

    const teamNamesList = config.teams.map(t => t.name)

    api.saveMockDraft({
      sport: config.sport || 'golf',
      draftType: config.draftType || 'snake',
      teamCount: config.teamCount || config.teams.length,
      rosterSize: config.rosterSize || Math.max(...picks.map(p => p.round), 6),
      userPosition: config.teams.findIndex(t => t.isUser) + 1,
      dataSource: apiPlayers ? 'api' : 'mock',
      picks: allPicksData,
      userPicks: userPicksData,
      teamNames: teamNamesList,
    }).then(saved => {
      navigate(`/draft/history/mock/${saved.id}`, { replace: true })
    }).catch(() => {
      // Fallback: stay on current completion screen
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete])

  if (!config || loadingPlayers) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
          {loadingPlayers && <p className="text-text-muted text-sm">Loading player data...</p>}
        </div>
      </div>
    )
  }

  // Draft Complete Screen (fallback if save fails)
  if (isComplete) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Grading your draft...</p>
        </div>
      </div>
    )
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null
    return (
      <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-dark-primary flex flex-col overflow-hidden">
      {/* ===== HEADER BAR ===== */}
      <div className="bg-dark-secondary border-b border-dark-border flex-shrink-0 z-30">
        <div className="px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  if (confirm('Leave mock draft? Progress will be lost.')) navigate('/mock-draft')
                }}
                className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-text-primary font-bold text-sm sm:text-base leading-tight">Mock Draft</h1>
                  {apiPlayers && (
                    <span className="px-1.5 py-0.5 bg-gold/15 text-gold text-[9px] font-semibold rounded">
                      LIVE DATA
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-xs hidden sm:block">
                  {config.teamCount} teams · {config.rosterSize} rds · {isAuction ? 'Auction' : 'Snake'} · {allPlayers.length} players
                  {isAuction && budgets[userTeamId] !== undefined && (
                    <span className="text-yellow-400 ml-1">${budgets[userTeamId]}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Center: Current Pick Status */}
            {isStarted && (isAuction || currentTeam) && (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold ${
                isPaused
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                  : (isUserTurn || isUserNominator)
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : isAuction && auctionPhase === 'bidding'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      : 'bg-dark-tertiary text-text-secondary'
              }`}>
                {isPaused ? 'PAUSED' : isAuction ? (
                  auctionPhase === 'bidding' && currentNom ? (
                    <>
                      <span className="text-text-primary">{currentNom.player?.name?.split(' ').pop()}</span>
                      <span className="text-yellow-400 font-bold">${currentNom.currentBid}</span>
                      <span className="text-text-muted">·</span>
                      <span>{config.teams.find(t => t.id === currentNom.highBidderTeamId)?.name}</span>
                    </>
                  ) : isUserNominator ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                      </span>
                      YOUR NOMINATION
                    </>
                  ) : `${nominatorTeam?.name} nominating...`
                ) : (
                  <>
                    {isUserTurn && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                      </span>
                    )}
                    {isUserTurn ? 'YOUR PICK' : `${currentTeam?.name} picking...`}
                  </>
                )}
              </div>
            )}

            {/* Right: Speed + Pause + Pick counter + Timer + Start */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {!isStarted ? (
                <Button onClick={handleStartDraft} size="sm">
                  Start Draft
                </Button>
              ) : (
                <>
                  {/* Speed selector */}
                  <div className="hidden sm:flex items-center bg-dark-primary rounded-lg border border-dark-border overflow-hidden">
                    {[
                      { key: 'normal', label: '1x' },
                      { key: 'fast', label: '2x' },
                      { key: 'instant', label: '>>' },
                    ].map(s => (
                      <button
                        key={s.key}
                        onClick={() => setDraftSpeed(s.key)}
                        className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                          draftSpeed === s.key
                            ? 'bg-gold/20 text-gold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Sound toggle */}
                  <button
                    onClick={toggleSound}
                    className={`p-1.5 rounded-lg transition-colors ${
                      soundEnabled
                        ? 'bg-dark-primary text-text-secondary hover:text-text-primary border border-dark-border'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                    title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
                  >
                    {soundEnabled ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </button>

                  {/* Pause/Play button */}
                  <button
                    onClick={handleTogglePause}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isPaused
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-dark-primary text-text-secondary hover:text-text-primary border border-dark-border'
                    }`}
                    title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
                  >
                    {isPaused ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    )}
                  </button>

                  <div className="text-right hidden sm:block">
                    {isAuction ? (
                      <>
                        <p className="text-text-muted text-[10px] leading-tight">BUDGET</p>
                        <p className="text-yellow-400 text-xs font-semibold">${budgets[userTeamId] ?? 0}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-text-muted text-[10px] leading-tight">ROUND {pickInfo?.round || 1}</p>
                        <p className="text-text-primary text-xs font-semibold">{currentPickNumber + 1}/{totalPicks}</p>
                      </>
                    )}
                  </div>
                  <div className="sm:hidden text-text-primary text-xs font-semibold">
                    {isAuction
                      ? <span className="text-yellow-400">${budgets[userTeamId] ?? 0}</span>
                      : <>R{pickInfo?.round} · {currentPickNumber + 1}/{totalPicks}</>
                    }
                  </div>
                  {isStarted && !isPaused && (
                    <div className={`px-3 py-1.5 rounded-lg font-bold text-base tabular-nums ${
                      (isUserTurn || isUserNominator || (isAuction && auctionPhase === 'bidding')) && timer <= 5 ? 'bg-red-500/20 text-red-400' :
                      (isUserTurn || isUserNominator) && timer <= 15 ? 'bg-yellow-500/20 text-yellow-400' :
                      (isUserTurn || isUserNominator) ? 'bg-gold/20 text-gold' :
                      isAuction && auctionPhase === 'bidding' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-dark-primary text-text-secondary border border-dark-border'
                    }`}>
                      {formatTime(timer)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile: Current pick banner */}
          {isStarted && (isAuction || currentTeam) && (
            <div className={`sm:hidden mt-1.5 px-3 py-1.5 rounded-lg text-center text-xs font-semibold ${
              isPaused
                ? 'bg-yellow-500/20 text-yellow-400'
                : (isUserTurn || isUserNominator)
                  ? 'bg-gold/20 text-gold'
                  : isAuction && auctionPhase === 'bidding'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-dark-tertiary text-text-secondary'
            }`}>
              {isPaused ? (
                <span className="flex items-center justify-center gap-1.5">
                  PAUSED
                  <span className="text-[10px] font-normal opacity-70">tap play to resume</span>
                </span>
              ) : isAuction ? (
                auctionPhase === 'bidding' && currentNom
                  ? <span>{currentNom.player?.name?.split(' ').pop()} · <span className="text-yellow-400">${currentNom.currentBid}</span></span>
                  : isUserNominator
                    ? <span className="flex items-center justify-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold" />
                        </span>
                        YOUR NOMINATION
                      </span>
                    : `${nominatorTeam?.name} nominating...`
              ) : isUserTurn ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold" />
                  </span>
                  YOUR PICK
                </span>
              ) : `${currentTeam?.name} picking...`}
            </div>
          )}

          {/* Mobile speed selector + sound toggle */}
          {isStarted && (
            <div className="sm:hidden flex items-center justify-center gap-1 mt-1.5">
              <span className="text-text-muted text-[10px] mr-1">Speed:</span>
              {[
                { key: 'normal', label: '1x' },
                { key: 'fast', label: '2x' },
                { key: 'instant', label: '>>' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setDraftSpeed(s.key)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                    draftSpeed === s.key
                      ? 'bg-gold/20 text-gold'
                      : 'text-text-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <span className="text-dark-border mx-1">|</span>
              <button
                onClick={toggleSound}
                className={`p-0.5 rounded transition-colors ${soundEnabled ? 'text-text-muted' : 'text-red-400'}`}
              >
                {soundEnabled ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pick Announcement Toast */}
      {recentPick && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 ${
            recentPick.teamId === userTeam?.id
              ? 'bg-gold text-text-primary'
              : 'bg-dark-secondary border border-dark-border text-text-primary'
          }`}>
            {isNfl && recentPick.playerPosition ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${NFL_POS_COLORS[recentPick.playerPosition] || ''}`}>
                {recentPick.playerPosition}
              </span>
            ) : (
              <span className="text-base">{recentPick.playerFlag}</span>
            )}
            <div>
              <p className="font-semibold text-sm">{recentPick.playerName}</p>
              <p className="text-xs opacity-80">
                {recentPick.playerPosition && isNfl ? `${recentPick.playerTeam} · ` : ''}
                {recentPick.amount ? `$${recentPick.amount} · ` : `#${recentPick.pickNumber} · `}{recentPick.teamName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pick Tag Prompt — appears after user makes a pick */}
      {pickTagPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in">
          <div className="bg-dark-secondary/95 backdrop-blur-md border-t border-stone/30 px-4 py-3 shadow-lg">
            <div className="max-w-2xl mx-auto">
              <p className="text-[11px] text-text-primary/40 mb-2 text-center">
                How'd that feel? <span className="text-text-primary/60 font-medium">{pickTagPrompt.playerName}</span>
              </p>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[
                  { tag: 'STEAL',    label: 'Steal',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                  { tag: 'PLAN',     label: 'The Plan',  color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                  { tag: 'VALUE',    label: 'Value',    color: 'bg-gold/20 text-gold border-gold/30' },
                  { tag: 'REACH',    label: 'Reach',    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                  { tag: 'FALLBACK', label: 'Fallback', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
                  { tag: 'PANIC',    label: 'Panic',    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
                ].map(({ tag, label, color }) => (
                  <button
                    key={tag}
                    onClick={() => handlePickTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-105 ${color}`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setPickTagPrompt(null)}
                  className="px-2 py-1.5 text-[10px] text-text-primary/20 hover:text-text-primary/40 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== AUCTION BIDDING BAR ===== */}
      {isAuction && isStarted && auctionPhase === 'bidding' && currentNom && (() => {
        const np = currentNom.player
        const enriched = np ? allPlayers.find(p => p.id === np.id) || np : null
        return (
        <div className="bg-yellow-500/[0.06] border-b-2 border-yellow-500/50 flex-shrink-0 z-20 shadow-[0_2px_12px_rgba(234,179,8,0.08)]">
          {/* Main bar */}
          <div className="px-3 sm:px-4 py-2.5 flex items-center gap-3">
            <button
              onClick={() => setNomExpanded(prev => !prev)}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left group px-2 py-1.5 -mx-2 -my-1.5 rounded-lg hover:bg-yellow-500/10 transition-colors"
            >
              {enriched?.headshot ? (
                <img src={enriched.headshot} alt="" className="w-10 h-10 rounded-full object-cover bg-dark-tertiary flex-shrink-0 ring-2 ring-yellow-500/50 shadow-lg" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dark-tertiary flex items-center justify-center ring-2 ring-yellow-500/50 flex-shrink-0">
                  <span className="text-xl">{enriched?.flag}</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-text-primary font-bold text-sm truncate group-hover:text-yellow-400 transition-colors">{enriched?.name}</p>
                  {enriched?.primaryTour && (
                    <span className={`text-[8px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${
                      enriched.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                      enriched.primaryTour === 'LIV' ? 'bg-red-500/20 text-red-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>{enriched.primaryTour}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                  <span>#{enriched?.rank}</span>
                  <span>·</span>
                  {isNfl ? (
                    <>
                      <span className={`font-bold ${NFL_POS_COLORS[enriched?.position]?.split(' ')[1] || ''}`}>{enriched?.position}</span>
                      <span>·</span>
                      <span>{enriched?.team}</span>
                      <span>·</span>
                      <span>{enriched?.ppg?.toFixed(1)} PPG</span>
                    </>
                  ) : (
                    <span>SG {enriched?.sg > 0 ? '+' : ''}{enriched?.sg?.toFixed(2)}</span>
                  )}
                  <span>·</span>
                  <span>Nom {config.teams.find(t => t.id === currentNom.nominatedByTeamId)?.name}</span>
                </div>
              </div>
              <div className="flex flex-col items-center flex-shrink-0">
                <svg className={`w-4 h-4 text-yellow-500/60 group-hover:text-yellow-400 transition-all ${nomExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {!nomExpanded && <span className="text-[8px] text-yellow-500/40 group-hover:text-yellow-400/70 transition-colors">Stats</span>}
              </div>
            </button>
            <div className="text-center px-4 py-1.5 flex-shrink-0 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-yellow-400/70 text-[10px] font-semibold tracking-wider">CURRENT BID</p>
              <p className="text-yellow-400 font-bold text-xl">${currentNom.currentBid}</p>
              <p className="text-text-muted text-[10px] truncate">
                {config.teams.find(t => t.id === currentNom.highBidderTeamId)?.name}
              </p>
            </div>
            {isUserBidding && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setNomBidInput(prev => Math.max(currentNom.currentBid + 1, prev - 1))}
                  className="w-7 h-7 bg-dark-primary rounded text-text-muted hover:text-text-primary flex items-center justify-center text-sm font-bold"
                >-</button>
                <span className="text-text-primary font-bold text-sm w-8 text-center tabular-nums">${nomBidInput}</span>
                <button
                  onClick={() => setNomBidInput(prev => Math.min(budgets[userTeamId] || 0, prev + 1))}
                  className="w-7 h-7 bg-dark-primary rounded text-text-muted hover:text-text-primary flex items-center justify-center text-sm font-bold"
                >+</button>
                <button
                  onClick={() => handlePlaceBid(nomBidInput)}
                  disabled={nomBidInput <= currentNom.currentBid || nomBidInput > (budgets[userTeamId] || 0)}
                  className="px-3 py-1.5 bg-yellow-500 text-slate rounded-lg text-xs font-bold hover:bg-yellow-400 transition-colors disabled:opacity-30"
                >
                  BID
                </button>
              </div>
            )}
            {!isUserBidding && currentNom.highBidderTeamId === userTeamId && (
              <span className="text-gold text-xs font-bold px-2 py-1 bg-gold/15 rounded-lg flex-shrink-0">WINNING</span>
            )}
          </div>

          {/* Expanded player profile card */}
          {nomExpanded && enriched && (
            <div className="px-3 sm:px-4 pb-3 animate-fade-in">
              <div className="bg-dark-primary rounded-lg border border-dark-border/50 p-3">
                {/* Stats grid */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[
                    { label: 'Events', value: enriched.tournaments },
                    { label: 'Wins', value: enriched.wins, highlight: enriched.wins > 0 },
                    { label: 'Top 5s', value: enriched.top5s },
                    { label: 'Top 10s', value: enriched.top10s },
                    { label: 'Top 25s', value: enriched.top25s },
                    { label: 'Cuts', value: `${enriched.cutsMade}/${enriched.tournaments}` },
                    { label: 'Cut %', value: `${enriched.cutsPct}%` },
                  ].map(stat => (
                    <div key={stat.label} className="text-center py-1.5">
                      <p className="text-text-muted text-[9px] uppercase tracking-wider mb-0.5">{stat.label}</p>
                      <p className={`text-sm font-bold tabular-nums ${stat.highlight ? 'text-yellow-400' : 'text-text-primary'}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* SG breakdown */}
                <div className="mt-2.5 pt-2.5 border-t border-dark-border/40">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: 'SG Total', value: enriched.sg },
                      { label: 'OTT', value: enriched.sgOTT },
                      { label: 'APP', value: enriched.sgAPP },
                      { label: 'ATG', value: enriched.sgATG },
                      { label: 'Putt', value: enriched.sgPutt },
                    ].map(stat => (
                      <div key={stat.label} className="text-center py-1">
                        <p className="text-text-muted text-[9px] uppercase tracking-wider mb-0.5">{stat.label}</p>
                        <p className={`text-xs font-bold tabular-nums ${stat.value > 0.3 ? 'text-gold' : stat.value >= 0 ? 'text-text-primary' : 'text-red-400'}`}>
                          {stat.value > 0 ? '+' : ''}{stat.value?.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent form */}
                {enriched.form?.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-dark-border/40">
                    <p className="text-text-muted text-[9px] uppercase tracking-wider mb-1.5">Recent Form</p>
                    <div className="flex gap-1.5">
                      {enriched.form.map((result, i) => {
                        const pos = parseInt(result.replace('T', ''))
                        return (
                          <span key={i} className={`flex-1 text-center py-1 rounded text-xs font-medium ${
                            result === '1' ? 'bg-yellow-500/20 text-yellow-400' :
                            result === 'CUT' ? 'bg-red-500/15 text-red-400' :
                            pos <= 5 ? 'bg-gold/20 text-gold' :
                            pos <= 15 ? 'bg-emerald-500/10 text-emerald-400/70' :
                            pos <= 30 ? 'bg-dark-tertiary text-text-secondary' :
                            'bg-dark-tertiary text-text-muted'
                          }`}>
                            {result === '1' ? '1st' : result}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )
      })()}

      {/* ===== MOBILE TAB BAR ===== */}
      <div className="lg:hidden flex border-b border-dark-border bg-dark-secondary flex-shrink-0">
        {[
          { key: 'board', label: 'Board' },
          { key: 'players', label: 'Players' },
          { key: 'queue', label: `Queue${queue.length ? ` (${queue.length})` : ''}` },
          { key: 'myteam', label: `Team (${userPicks.length})` },
          { key: 'chat', label: 'Chat' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
              activeTab === tab.key
                ? 'text-gold border-b-2 border-gold'
                : 'text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ===== TOP: DRAFT BOARD (full width, ~45% on desktop) ===== */}
        <div className={`flex-col min-h-0 border-b-2 border-gold/30 ${
          activeTab === 'board' ? 'flex flex-1' : 'hidden'
        } lg:flex lg:flex-none lg:h-[45%]`}>
          {/* Board Column Headers */}
          <div className="flex-shrink-0 bg-dark-secondary border-b border-dark-border" ref={boardRef}>
            <div className="overflow-x-auto">
              <div className="grid gap-px min-w-[500px]"
                style={{ gridTemplateColumns: `44px repeat(${config.teamCount}, 1fr)` }}>
                <div className="bg-dark-tertiary px-1 py-2 text-text-muted text-[10px] font-semibold text-center">RD</div>
                {config.teams.map(team => (
                  <div
                    key={team.id}
                    className={`px-1 py-2.5 text-[10px] font-semibold text-center truncate ${
                      team.isUser
                        ? 'bg-gold/30 text-gold border-b-2 border-b-gold'
                        : isAuction && nominatorTeam?.id === team.id
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : !isAuction && pickInfo && config.teams[pickInfo.orderIndex]?.id === team.id
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-dark-tertiary text-text-muted'
                    }`}
                  >
                    {team.isUser ? (
                      <span className="font-bold">YOU</span>
                    ) : (
                      team.name.length > 10 ? team.name.slice(0, 9) + '…' : team.name
                    )}
                    {isAuction && isStarted && (
                      <div className="text-[8px] text-yellow-400/70 font-normal">${budgets[team.id] ?? 0}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Board Rows */}
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
            <div className="min-w-[500px]">
              {Array.from({ length: config.rosterSize }, (_, roundIdx) => {
                const round = roundIdx + 1
                const isReverse = round % 2 === 0
                const isCurrentRound = pickInfo?.round === round

                return (
                  <div
                    key={round}
                    data-round={round}
                    className={`grid gap-px ${isCurrentRound ? 'bg-dark-border' : ''}`}
                    style={{ gridTemplateColumns: `44px repeat(${config.teamCount}, 1fr)` }}
                  >
                    <div className={`px-1 py-1 text-[10px] text-center flex flex-col items-center justify-center font-semibold ${
                      isCurrentRound ? 'text-gold bg-dark-secondary' : 'text-text-muted bg-dark-primary/80'
                    }`}>
                      <span>{round}</span>
                      {!isAuction && <span className="text-[8px] opacity-50">{isReverse ? '←' : '→'}</span>}
                    </div>
                    {config.teams.map((team, teamIdx) => {
                      // Auction: fill each team's column top-to-bottom; Snake: snake pattern
                      let pick, isCurrent
                      if (isAuction) {
                        const teamPicks = picks.filter(p => p.teamId === team.id)
                        pick = teamPicks[roundIdx] || null
                        isCurrent = false // no single "current cell" in auction
                      } else {
                        const actualPickIndex = isReverse
                          ? roundIdx * config.teamCount + (config.teamCount - 1 - teamIdx)
                          : roundIdx * config.teamCount + teamIdx
                        pick = picks[actualPickIndex]
                        isCurrent = actualPickIndex === currentPickNumber && isStarted
                      }
                      const isUserTeamCell = team.isUser

                      return (
                        <div
                          key={teamIdx}
                          onClick={() => {
                            if (pick) {
                              const enriched = allPlayers.find(p => p.id === pick.playerId)
                              if (enriched) setSelectedPlayer({ ...enriched, _drafted: true })
                            }
                          }}
                          className={`px-1 py-1 min-h-[44px] flex items-center justify-center transition-colors ${
                            pick ? 'cursor-pointer hover:brightness-125' : ''
                          } ${
                            isCurrent
                              ? 'bg-gold/25 ring-2 ring-inset ring-gold'
                              : pick
                                ? pick.playerRank <= 10
                                  ? isUserTeamCell ? 'bg-yellow-500/20' : 'bg-yellow-500/12'
                                  : pick.playerRank <= 25
                                    ? isUserTeamCell ? 'bg-gold/18' : 'bg-gold/10'
                                    : isUserTeamCell ? 'bg-gold/10' : roundIdx % 2 === 0 ? 'bg-dark-primary' : 'bg-dark-secondary/50'
                                : roundIdx % 2 === 0 ? 'bg-dark-primary/50' : 'bg-dark-secondary/25'
                          }`}
                        >
                          {pick ? (
                            <div className="text-center w-full truncate px-0.5">
                              <div className="flex items-center justify-center gap-0.5">
                                {isNfl && pick.playerPosition ? (
                                  <span className={`text-[8px] font-bold px-1 rounded ${NFL_POS_COLORS[pick.playerPosition] || 'text-text-muted'}`}>
                                    {pick.playerPosition}
                                  </span>
                                ) : (
                                  <>
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      pick.playerRank <= 10 ? 'bg-yellow-400' :
                                      pick.playerRank <= 25 ? 'bg-gold' :
                                      pick.playerRank <= 40 ? 'bg-blue-400' :
                                      'bg-dark-border/40'
                                    }`} />
                                    <span className="text-xs">{pick.playerFlag}</span>
                                  </>
                                )}
                              </div>
                              <p className={`text-[10px] leading-tight truncate ${
                                isUserTeamCell ? 'text-gold font-medium' : 'text-text-secondary'
                              }`}>
                                {pick.playerName.split(' ').pop()}
                              </p>
                              <p className="text-[9px] text-text-muted">
                                {isAuction && pick.amount ? `$${pick.amount}` : `#${pick.playerRank}`}
                              </p>
                            </div>
                          ) : isCurrent ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                            </span>
                          ) : (
                            <span className="text-[9px] text-text-muted/30 tabular-nums">
                              {isAuction ? '—' : `${round}.${teamIdx + 1}`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ===== BOTTOM: PLAYER TABLE + SIDE PANEL ===== */}
        <div className={`flex-col min-h-0 overflow-hidden ${
          activeTab === 'board' ? 'hidden' : 'flex flex-1'
        } lg:flex lg:flex-1 lg:flex-row`}>

          {/* LEFT: Player Table (always visible on desktop, 'players' tab on mobile) */}
          <div className={`flex-col min-h-0 ${
            activeTab === 'players' ? 'flex flex-1' : 'hidden'
          } lg:flex lg:flex-none lg:w-[60%] lg:border-r lg:border-dark-border`}>
            <div className="h-full flex flex-col">
                {/* Search Bar + Show Drafted Toggle */}
                <div className="flex-shrink-0 p-3 bg-dark-secondary/50">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-dark-primary border border-dark-border rounded-lg text-text-primary text-sm focus:border-gold focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setShowDrafted(!showDrafted)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors border ${
                        showDrafted
                          ? 'bg-gold/15 border-gold/30 text-gold'
                          : 'bg-dark-primary border-dark-border text-text-muted hover:text-text-primary hover:border-dark-border'
                      }`}
                    >
                      {showDrafted ? 'Hide Drafted' : 'Show Drafted'}
                    </button>
                  </div>
                </div>

                {/* NFL position filter pills */}
                {isNfl && (
                  <div className="flex-shrink-0 px-3 pb-2 flex gap-1.5 overflow-x-auto">
                    {['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(pos => (
                      <button
                        key={pos}
                        onClick={() => setPosFilter(pos)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                          posFilter === pos
                            ? pos === 'ALL' ? 'bg-gold/20 text-gold' : (NFL_POS_COLORS[pos] || 'bg-gold/20 text-gold')
                            : 'bg-dark-primary text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                )}

                {/* Player Table */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {/* Table Header */}
                  <div className="sticky top-0 bg-dark-secondary z-10 border-b border-dark-border">
                    {isNfl ? (
                      <div className="grid grid-cols-[30px_1fr_36px_36px_48px_44px_48px] px-3 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                        <button onClick={() => handleSort('rank')} className="text-left hover:text-text-primary transition-colors">
                          Rk <SortIcon field="rank" />
                        </button>
                        <button onClick={() => handleSort('name')} className="text-left hover:text-text-primary transition-colors">
                          Player <SortIcon field="name" />
                        </button>
                        <span className="text-center">Pos</span>
                        <span className="text-center">Team</span>
                        <button onClick={() => handleSort('ppg')} className="text-right hover:text-text-primary transition-colors">
                          PPG <SortIcon field="ppg" />
                        </button>
                        <button onClick={() => handleSort('totalPts')} className="text-right hover:text-text-primary transition-colors">
                          Pts <SortIcon field="totalPts" />
                        </button>
                        <div />
                      </div>
                    ) : (
                      <div className="grid grid-cols-[30px_1fr_44px_36px_30px_44px_48px] px-3 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                        <button onClick={() => handleSort('rank')} className="text-left hover:text-text-primary transition-colors">
                          Rk <SortIcon field="rank" />
                        </button>
                        <button onClick={() => handleSort('name')} className="text-left hover:text-text-primary transition-colors">
                          Player <SortIcon field="name" />
                        </button>
                        <button onClick={() => handleSort('sg')} className="text-right hover:text-text-primary transition-colors">
                          SG <SortIcon field="sg" />
                        </button>
                        <button onClick={() => handleSort('top10')} className="text-right hover:text-text-primary transition-colors">
                          T10 <SortIcon field="top10" />
                        </button>
                        <span className="text-center" title="Tournaments played">Evt</span>
                        <span className="text-center">Form</span>
                        <div />
                      </div>
                    )}
                  </div>

                  {/* Player Rows */}
                  {filteredPlayers.map(player => {
                    const inQueue = queue.find(q => q.id === player.id)
                    return (
                      <div
                        key={player.id}
                        className={`grid ${isNfl ? 'grid-cols-[30px_1fr_36px_36px_48px_44px_48px]' : 'grid-cols-[30px_1fr_44px_36px_30px_44px_48px]'} px-3 py-2 border-b border-dark-border/30 items-center transition-colors ${
                          player.isDrafted
                            ? 'opacity-40 bg-dark-primary/50'
                            : `cursor-pointer hover:bg-dark-tertiary/50 ${inQueue ? 'bg-orange/5' : ''}`
                        }`}
                        onClick={() => !player.isDrafted && setSelectedPlayer(player)}
                      >
                        <span className="text-text-muted text-xs">{player.rank}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          {isNfl ? (
                            player.headshot ? (
                              <img src={player.headshot} alt="" className="w-6 h-6 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                            ) : (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${NFL_POS_COLORS[player.position] || 'bg-dark-tertiary text-text-muted'}`}>
                                <span className="text-[8px] font-bold">{player.position}</span>
                              </div>
                            )
                          ) : (
                            player.headshot ? (
                              <img src={player.headshot} alt="" className="w-6 h-6 rounded-full object-cover bg-dark-tertiary flex-shrink-0" />
                            ) : (
                              <span className="text-sm flex-shrink-0">{player.flag}</span>
                            )
                          )}
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-text-primary text-sm truncate">{player.name}</span>
                            {getBoardEntry(player) && (
                              <>
                                <span className="text-[9px] text-gold/50 font-mono shrink-0">B{getBoardEntry(player).rank}</span>
                                {getBoardEntry(player).tags?.[0] && (
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    getBoardEntry(player).tags[0] === 'target' ? 'bg-emerald-400' :
                                    getBoardEntry(player).tags[0] === 'sleeper' ? 'bg-gold' : 'bg-red-400'
                                  }`} />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {isNfl ? (
                          <>
                            <span className={`text-[10px] text-center font-bold ${NFL_POS_COLORS[player.position]?.split(' ')[1] || 'text-text-muted'}`}>
                              {player.position}
                            </span>
                            <span className="text-xs text-center text-text-secondary">{player.team}</span>
                            <span className="text-xs text-right font-medium text-gold tabular-nums">
                              {player.ppg?.toFixed(1)}
                            </span>
                            <span className="text-xs text-right text-text-secondary tabular-nums">
                              {player.totalPts?.toFixed(0) || '—'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={`text-xs text-right font-medium tabular-nums ${
                              player.sg >= 1 ? 'text-gold' : player.sg > 0 ? 'text-text-primary' : 'text-red-400'
                            }`}>
                              {player.sg > 0 ? '+' : ''}{player.sg?.toFixed(2)}
                            </span>
                            <span className="text-xs text-right text-text-secondary tabular-nums">
                              {player.top10}%
                            </span>
                            <span className="text-xs text-center text-text-muted tabular-nums">
                              {player.tournaments}
                            </span>
                            <div className="flex items-center justify-center gap-1">
                              {player.form?.slice(0, 4).map((f, i) => {
                                const pos = parseInt(f.replace('T', ''))
                                return (
                                  <span key={i} className={`w-2 h-2 rounded-full ${
                                    f === '1' ? 'bg-yellow-400' :
                                    f === 'CUT' ? 'bg-red-400' :
                                    pos <= 5 ? 'bg-gold' :
                                    pos <= 15 ? 'bg-emerald-400/60' :
                                    'bg-dark-border/30'
                                  }`} title={f} />
                                )
                              })}
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-end gap-1">
                          {player.isDrafted ? (
                            <span className="px-1.5 py-0.5 bg-dark-border/40 text-text-muted text-[9px] font-mono uppercase rounded">
                              Drafted
                            </span>
                          ) : (
                            <>
                              {isAuction ? (
                                isUserNominator && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleNominate(player, 1) }}
                                    className="px-2 py-1 bg-yellow-500 text-slate text-[10px] rounded font-semibold hover:bg-yellow-400 transition-colors"
                                  >
                                    Nom
                                  </button>
                                )
                              ) : (
                                isUserTurn && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMakePick(player) }}
                                    className="px-2 py-1 bg-gold text-text-primary text-[10px] rounded font-semibold hover:bg-gold/80 transition-colors"
                                  >
                                    Draft
                                  </button>
                                )
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  inQueue ? handleRemoveFromQueue(player.id) : handleAddToQueue(player)
                                }}
                                className={`p-1 rounded transition-colors ${
                                  inQueue ? 'text-orange' : 'text-text-muted hover:text-orange'
                                }`}
                              >
                            <svg className="w-3.5 h-3.5" fill={inQueue ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {filteredPlayers.length === 0 && (
                    <div className="text-center py-8 text-text-muted text-sm">
                      {searchQuery ? 'No players match your search' : 'All players have been drafted'}
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* RIGHT: Side Panel - Queue/Roster/Picks */}
          <div className={`flex-col min-h-0 ${
            activeTab === 'queue' || activeTab === 'myteam' || activeTab === 'chat' ? 'flex flex-1' : 'hidden'
          } lg:flex lg:flex-none lg:w-[40%]`}>
            {/* Desktop Side Panel Tabs */}
            <div className="hidden lg:flex border-b border-dark-border bg-dark-secondary flex-shrink-0">
              {[
                { key: 'queue', label: `Queue (${queue.length})` },
                ...(boardEntries.length > 0 ? [{ key: 'myboard', label: 'Board' }] : []),
                { key: 'myteam', label: `My Team (${userPicks.length}/${config.rosterSize})` },
                { key: 'picks', label: 'Picks' },
                { key: 'chat', label: 'Chat' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setBottomTab(tab.key)}
                  className={`flex-1 px-3 py-2 text-xs font-mono font-medium uppercase tracking-wider transition-colors ${
                    bottomTab === tab.key
                      ? 'text-gold border-b-2 border-gold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
            {/* === QUEUE TAB === */}
            {(activeTab === 'queue' || (activeTab === 'board' && bottomTab === 'queue')) && (
              <div className="h-full flex flex-col">
                {/* Auto-pick toggle */}
                <div className="flex-shrink-0 px-3 pt-3 pb-1">
                  <div className="flex items-center justify-between p-2.5 bg-dark-primary rounded-lg border border-dark-border">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Auto-Pick</span>
                      {autoPickCountdown > 0 && (
                        <span className="text-xs font-mono text-yellow-400 animate-pulse">
                          {autoPickCountdown}s
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {autoPickCountdown > 0 && (
                        <button
                          onClick={() => {
                            clearInterval(autoPickCountdownRef.current)
                            setAutoPickCountdown(0)
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-medium uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (autoPick) {
                            // Turning off — instant
                            clearInterval(autoPickCountdownRef.current)
                            setAutoPickCountdown(0)
                            setAutoPick(false)
                            autoPickRef.current = false
                            sessionStorage.setItem('mockDraftAutoPick', 'false')
                          } else if (autoPickCountdown > 0) {
                            // Already counting down — cancel
                            clearInterval(autoPickCountdownRef.current)
                            setAutoPickCountdown(0)
                          } else {
                            // Turning on — 5 second countdown
                            setAutoPickCountdown(5)
                            autoPickCountdownRef.current = setInterval(() => {
                              setAutoPickCountdown(prev => {
                                if (prev <= 1) {
                                  clearInterval(autoPickCountdownRef.current)
                                  setAutoPick(true)
                                  autoPickRef.current = true
                                  sessionStorage.setItem('mockDraftAutoPick', 'true')
                                  return 0
                                }
                                return prev - 1
                              })
                            }, 1000)
                          }
                        }}
                        className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                          autoPick ? 'bg-gold' : autoPickCountdown > 0 ? 'bg-yellow-500/50' : 'bg-dark-tertiary border border-dark-border'
                        }`}
                      >
                        <span className={`inline-block w-3.5 h-3.5 rounded-full bg-dark-tertiary shadow-sm transition-transform ${
                          autoPick || autoPickCountdown > 0 ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-3 pt-2">
                  {queue.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <p className="text-text-muted text-sm font-medium mb-1">Your Queue is Empty</p>
                      <p className="text-text-muted text-xs">Bookmark players from the Players tab to build your auto-pick queue</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {queue.map((player, i) => (
                        <div key={player.id} className="flex items-center justify-between p-2.5 bg-dark-primary rounded-lg group">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-orange text-xs font-bold w-5 text-center">{i + 1}</span>
                            {isNfl && player.position ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${NFL_POS_COLORS[player.position] || ''}`}>
                                {player.position}
                              </span>
                            ) : (
                              <span className="text-sm">{player.flag}</span>
                            )}
                            <div className="min-w-0">
                              <p className="text-text-primary text-sm font-medium truncate">{player.name}</p>
                              <p className="text-text-muted text-xs">
                                {isNfl
                                  ? `#${player.rank} · ${player.team} · ${player.ppg?.toFixed(1)} PPG`
                                  : `#${player.rank} · SG ${player.sg > 0 ? '+' : ''}${player.sg?.toFixed(2)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isAuction ? (
                              isUserNominator && (
                                <button
                                  onClick={() => handleNominate(player, 1)}
                                  className="px-2 py-1 bg-yellow-500 text-slate text-[10px] rounded font-semibold hover:bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Nom
                                </button>
                              )
                            ) : (
                              isUserTurn && (
                                <button
                                  onClick={() => handleMakePick(player)}
                                  className="px-2 py-1 bg-gold text-text-primary text-[10px] rounded font-semibold hover:bg-gold/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Draft
                                </button>
                              )
                            )}
                            <button
                              onClick={() => handleRemoveFromQueue(player.id)}
                              className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === BOARD TAB (workspace cheat sheet) === */}
            {boardEntries.length > 0 && (activeTab === 'board' && bottomTab === 'myboard') && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                  <div className="space-y-0.5">
                    {boardEntries.map((entry, i) => {
                      const tier = entry.tier
                      const prevTier = i > 0 ? boardEntries[i - 1].tier : null
                      const showTierDivider = tier && tier !== prevTier
                      const isDrafted = picks.some(p =>
                        p.playerId === entry.playerId ||
                        p.playerName?.toLowerCase() === entry.player?.name?.toLowerCase()
                      )
                      const tag = entry.tags?.[0]
                      return (
                        <div key={entry.id}>
                          {showTierDivider && (
                            <div className="text-[10px] font-bold uppercase text-text-primary/20 tracking-wider mt-3 mb-1 px-2">
                              Tier {tier}
                            </div>
                          )}
                          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                            isDrafted ? 'opacity-30' : 'hover:bg-dark-tertiary/30'
                          }`}>
                            <span className="text-gold text-xs font-bold w-5 text-center">{entry.rank}</span>
                            {isNfl && entry.player?.nflPosition && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${NFL_POS_COLORS[entry.player.nflPosition] || ''}`}>
                                {entry.player.nflPosition}
                              </span>
                            )}
                            <span className={`text-sm flex-1 truncate ${isDrafted ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                              {entry.player?.name || 'Unknown'}
                            </span>
                            {tag && (
                              <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded shrink-0 ${
                                tag === 'target' ? 'bg-emerald-500/20 text-emerald-400' :
                                tag === 'sleeper' ? 'bg-gold/20 text-gold' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {tag}
                              </span>
                            )}
                            {isDrafted && (
                              <span className="text-[9px] text-text-muted font-mono shrink-0">
                                {picks.find(p => p.playerId === entry.playerId || p.playerName?.toLowerCase() === entry.player?.name?.toLowerCase())?.teamName?.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* === MY TEAM TAB === */}
            {(activeTab === 'myteam' || (activeTab === 'board' && bottomTab === 'myteam')) && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                  {userPicks.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-text-muted text-sm font-medium mb-1">No Picks Yet</p>
                      <p className="text-text-muted text-xs">Your drafted players will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {userPicks.map(pick => (
                        <div key={pick.id} className="flex items-center justify-between p-2.5 bg-dark-primary rounded-lg">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-gold text-xs font-bold w-5 text-center">R{pick.round}</span>
                            {isNfl && pick.playerPosition ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${NFL_POS_COLORS[pick.playerPosition] || ''}`}>
                                {pick.playerPosition}
                              </span>
                            ) : (
                              <span className="text-sm">{pick.playerFlag}</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-text-primary text-sm font-medium truncate">{pick.playerName}</p>
                              <p className="text-text-muted text-xs">
                                {isNfl && pick.playerTeam ? `${pick.playerTeam} · ` : ''}
                                Pick #{pick.pickNumber} · Rank #{pick.playerRank}
                              </p>
                            </div>
                            {pick.pickTag && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                pick.pickTag === 'STEAL' ? 'bg-emerald-500/20 text-emerald-400' :
                                pick.pickTag === 'PLAN' ? 'bg-blue-500/20 text-blue-400' :
                                pick.pickTag === 'VALUE' ? 'bg-gold/20 text-gold' :
                                pick.pickTag === 'REACH' ? 'bg-orange-500/20 text-orange-400' :
                                pick.pickTag === 'FALLBACK' ? 'bg-purple-500/20 text-purple-400' :
                                pick.pickTag === 'PANIC' ? 'bg-rose-500/20 text-rose-400' :
                                'bg-dark-tertiary/10 text-text-primary/40'
                              }`}>
                                {pick.pickTag}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Empty slots */}
                      {Array.from({ length: config.rosterSize - userPicks.length }, (_, i) => (
                        <div key={`empty-${i}`} className="flex items-center p-2.5 rounded-lg border border-dashed border-dark-border/50">
                          <span className="text-text-muted text-xs w-5 text-center">R{userPicks.length + i + 1}</span>
                          <span className="text-text-muted text-xs ml-3">—</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === PICKS TAB (desktop only) === */}
            {(activeTab === 'board' && bottomTab === 'picks') && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                  {picks.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-text-muted text-sm">No picks yet — start the draft!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {[...picks].reverse().map(pick => (
                        <div key={pick.id} className={`flex items-center justify-between p-2.5 rounded-lg ${
                          pick.teamId === userTeam?.id ? 'bg-gold/10' : 'bg-dark-primary'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-text-muted text-xs font-bold w-6 text-right">#{pick.pickNumber}</span>
                            {isNfl && pick.playerPosition ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${NFL_POS_COLORS[pick.playerPosition] || ''}`}>
                                {pick.playerPosition}
                              </span>
                            ) : (
                              <span className="text-sm">{pick.playerFlag}</span>
                            )}
                            <div className="min-w-0">
                              <p className="text-text-primary text-sm truncate">{pick.playerName}</p>
                              <p className="text-text-muted text-xs">R{pick.round} · {pick.teamName}</p>
                            </div>
                          </div>
                          <span className="text-text-muted text-xs flex-shrink-0">#{pick.playerRank}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === CHAT TAB === */}
            {(activeTab === 'chat' || (activeTab === 'board' && bottomTab === 'chat')) && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1.5">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-text-muted text-sm">No messages yet</p>
                      <p className="text-text-muted text-xs mt-1">Chat with your league during the draft</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={msg.isSystem ? 'text-center' : ''}>
                        {msg.isSystem ? (
                          <p className="text-text-muted text-xs py-1">{msg.text}</p>
                        ) : (
                          <div className={`flex gap-2 ${msg.isUser ? 'justify-end' : ''}`}>
                            <div className={`max-w-[85%]`}>
                              {!msg.isUser && (
                                <p className="text-[10px] text-text-muted mb-0.5 font-medium">{msg.sender}</p>
                              )}
                              <div className={`px-2.5 py-1.5 rounded-lg text-sm ${
                                msg.isUser
                                  ? 'bg-gold/20 text-text-primary rounded-br-sm'
                                  : 'bg-dark-primary text-text-secondary rounded-bl-sm'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendChat() }}
                  className="flex-shrink-0 p-2 border-t border-dark-border"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-1.5 bg-dark-primary border border-dark-border rounded-lg text-text-primary text-sm focus:border-gold focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-3 py-1.5 bg-gold text-text-primary rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gold/80 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Player Popup */}
      {selectedPlayer && (
        <PlayerPopup
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onDraft={handleMakePick}
          onNominate={(p) => handleNominate(p, 1)}
          onQueue={(p) => {
            const inQ = queue.find(q => q.id === p.id)
            inQ ? handleRemoveFromQueue(p.id) : handleAddToQueue(p)
          }}
          isUserTurn={isUserTurn}
          isUserNominator={isUserNominator}
          isAuction={isAuction}
          inQueue={!!queue.find(q => q.id === selectedPlayer.id)}
          isDrafted={!!selectedPlayer._drafted}
          sport={config?.sport}
        />
      )}

      {/* Tier depletion alert toast */}
      {tierAlert && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-orange/90 text-text-primary text-sm font-semibold rounded-lg shadow-lg animate-pulse">
          {tierAlert}
        </div>
      )}

      {/* AI Coach Nudge */}
      {draftNudge && isUserTurn && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 max-w-sm w-full px-4">
          <div className="bg-purple-500/15 border border-purple-400/30 backdrop-blur-xl rounded-xl px-4 py-3 shadow-lg flex items-start gap-2">
            <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-purple-300 font-semibold">Clutch Coach</p>
              <p className="text-xs text-text-primary/70 leading-relaxed">{draftNudge.nudgeText}</p>
            </div>
            <button onClick={() => setDraftNudge(null)} className="text-text-primary/30 hover:text-text-primary/60 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MockDraftRoom
