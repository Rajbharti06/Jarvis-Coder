"""
Learning Service
Implements the self-improving core system with continuous learning
and autonomous upgrade capabilities for Trae Cursor Blackbox
"""

import asyncio
import json
import logging
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import numpy as np
from collections import defaultdict, deque
import pickle
import hashlib

from backend.core.config import settings

logger = logging.getLogger(__name__)

class LearningService:
    """
    Service for implementing continuous learning and self-improvement
    Tracks user interactions, analyzes patterns, and optimizes performance
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.learning_data = defaultdict(list)
        self.performance_history = deque(maxlen=1000)
        self.user_preferences = {}
        self.model_performance = defaultdict(dict)
        self.optimization_rules = []
        self.learning_models = {}
        
        # Learning parameters
        self.learning_rate = 0.01
        self.adaptation_threshold = 0.1
        self.min_samples_for_learning = 10
        
        # Initialize learning database (will be called when needed)
        self._db_initialized = False
        self._learning_started = False
    
    async def _init_learning_db(self):
        """Initialize the learning database with required tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # User interactions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    interaction_type TEXT,
                    input_data TEXT,
                    output_data TEXT,
                    model_used TEXT,
                    response_time REAL,
                    user_rating INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    context_data TEXT
                )
            ''')
            
            # Performance metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT,
                    metric_value REAL,
                    model_name TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    context TEXT
                )
            ''')
            
            # Learning patterns table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS learning_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern_type TEXT,
                    pattern_data TEXT,
                    confidence_score REAL,
                    usage_count INTEGER DEFAULT 0,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # User preferences table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    preference_key TEXT,
                    preference_value TEXT,
                    confidence REAL,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, preference_key)
                )
            ''')
            
            # Model optimization rules table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS optimization_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rule_name TEXT UNIQUE,
                    rule_condition TEXT,
                    rule_action TEXT,
                    effectiveness_score REAL,
                    usage_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_applied DATETIME
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("Learning database initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing learning database: {e}")
        finally:
            self._db_initialized = True
    
    async def ensure_initialized(self):
        """Ensure learning database is initialized"""
        if not self._db_initialized:
            await self._init_learning_db()
        if not self._learning_started:
            asyncio.create_task(self._continuous_learning_loop())
            self._learning_started = True
    
    async def record_interaction(
        self,
        user_id: str,
        interaction_type: str,
        input_data: str,
        output_data: str,
        model_used: str,
        response_time: float,
        user_rating: Optional[int] = None,
        context_data: Optional[Dict[str, Any]] = None
    ):
        """Record a user interaction for learning purposes"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO user_interactions 
                (user_id, interaction_type, input_data, output_data, model_used, 
                 response_time, user_rating, context_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, interaction_type, input_data, output_data,
                model_used, response_time, user_rating,
                json.dumps(context_data) if context_data else None
            ))
            
            conn.commit()
            conn.close()
            
            # Update in-memory learning data
            self.learning_data[user_id].append({
                'type': interaction_type,
                'input': input_data,
                'output': output_data,
                'model': model_used,
                'response_time': response_time,
                'rating': user_rating,
                'timestamp': time.time(),
                'context': context_data
            })
            
            # Trigger learning if enough data
            if len(self.learning_data[user_id]) >= self.min_samples_for_learning:
                await self._analyze_user_patterns(user_id)
            
        except Exception as e:
            logger.error(f"Error recording interaction: {e}")
    
    async def record_performance_metric(
        self,
        metric_name: str,
        metric_value: float,
        model_name: str,
        context: Optional[str] = None
    ):
        """Record a performance metric for analysis"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO performance_metrics (metric_name, metric_value, model_name, context)
                VALUES (?, ?, ?, ?)
            ''', (metric_name, metric_value, model_name, context))
            
            conn.commit()
            conn.close()
            
            # Update in-memory performance tracking
            self.performance_history.append({
                'metric': metric_name,
                'value': metric_value,
                'model': model_name,
                'timestamp': time.time(),
                'context': context
            })
            
            # Update model performance tracking
            if model_name not in self.model_performance:
                self.model_performance[model_name] = defaultdict(list)
            
            self.model_performance[model_name][metric_name].append(metric_value)
            
        except Exception as e:
            logger.error(f"Error recording performance metric: {e}")
    
    async def _analyze_user_patterns(self, user_id: str):
        """Analyze user interaction patterns to identify preferences"""
        try:
            user_data = self.learning_data[user_id]
            if len(user_data) < self.min_samples_for_learning:
                return
            
            # Analyze model preferences
            model_ratings = defaultdict(list)
            model_usage = defaultdict(int)
            
            for interaction in user_data:
                model = interaction['model']
                model_usage[model] += 1
                
                if interaction['rating']:
                    model_ratings[model].append(interaction['rating'])
            
            # Calculate model preferences
            model_preferences = {}
            for model, ratings in model_ratings.items():
                if ratings:
                    avg_rating = np.mean(ratings)
                    usage_weight = model_usage[model] / len(user_data)
                    preference_score = avg_rating * 0.7 + usage_weight * 0.3
                    model_preferences[model] = preference_score
            
            # Update user preferences
            await self._update_user_preferences(user_id, 'preferred_models', model_preferences)
            
            # Analyze response time preferences
            response_times = [i['response_time'] for i in user_data if i['response_time']]
            if response_times:
                avg_response_time = np.mean(response_times)
                await self._update_user_preferences(user_id, 'preferred_response_time', avg_response_time)
            
            # Analyze interaction types
            interaction_types = defaultdict(int)
            for interaction in user_data:
                interaction_types[interaction['type']] += 1
            
            most_common_type = max(interaction_types, key=interaction_types.get)
            await self._update_user_preferences(user_id, 'primary_use_case', most_common_type)
            
            logger.info(f"Updated patterns for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error analyzing user patterns: {e}")
    
    async def _update_user_preferences(
        self,
        user_id: str,
        preference_key: str,
        preference_value: Any,
        confidence: float = 0.8
    ):
        """Update user preferences in the database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO user_preferences 
                (user_id, preference_key, preference_value, confidence)
                VALUES (?, ?, ?, ?)
            ''', (user_id, preference_key, json.dumps(preference_value), confidence))
            
            conn.commit()
            conn.close()
            
            # Update in-memory preferences
            if user_id not in self.user_preferences:
                self.user_preferences[user_id] = {}
            
            self.user_preferences[user_id][preference_key] = {
                'value': preference_value,
                'confidence': confidence,
                'updated': time.time()
            }
            
        except Exception as e:
            logger.error(f"Error updating user preferences: {e}")
    
    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences for personalization"""
        try:
            if user_id in self.user_preferences:
                return self.user_preferences[user_id]
            
            # Load from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT preference_key, preference_value, confidence
                FROM user_preferences
                WHERE user_id = ?
            ''', (user_id,))
            
            preferences = {}
            for row in cursor.fetchall():
                key, value, confidence = row
                preferences[key] = {
                    'value': json.loads(value),
                    'confidence': confidence
                }
            
            conn.close()
            
            self.user_preferences[user_id] = preferences
            return preferences
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return {}
    
    async def recommend_model(
        self,
        user_id: str,
        task_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, float]:
        """Recommend the best model for a user and task"""
        try:
            preferences = await self.get_user_preferences(user_id)
            
            # Get preferred models
            preferred_models = preferences.get('preferred_models', {}).get('value', {})
            
            # Get model performance for task type
            task_performance = {}
            for model, metrics in self.model_performance.items():
                if task_type in metrics:
                    avg_performance = np.mean(metrics[task_type])
                    task_performance[model] = avg_performance
            
            # Combine preferences and performance
            recommendations = {}
            for model in set(list(preferred_models.keys()) + list(task_performance.keys())):
                score = 0.0
                
                # User preference weight (40%)
                if model in preferred_models:
                    score += preferred_models[model] * 0.4
                
                # Performance weight (60%)
                if model in task_performance:
                    score += task_performance[model] * 0.6
                
                recommendations[model] = score
            
            if recommendations:
                best_model = max(recommendations, key=recommendations.get)
                confidence = recommendations[best_model]
                return best_model, confidence
            
            # Fallback to most used model
            if preferred_models:
                best_model = max(preferred_models, key=preferred_models.get)
                return best_model, 0.5
            
            return "default", 0.3
            
        except Exception as e:
            logger.error(f"Error recommending model: {e}")
            return "default", 0.3
    
    async def optimize_model_selection(self) -> Dict[str, Any]:
        """Optimize model selection based on learning data"""
        try:
            optimizations = []
            
            # Analyze model performance trends
            for model, metrics in self.model_performance.items():
                for metric_name, values in metrics.items():
                    if len(values) >= 10:  # Enough data for analysis
                        recent_values = values[-10:]
                        older_values = values[-20:-10] if len(values) >= 20 else values[:-10]
                        
                        if older_values:
                            recent_avg = np.mean(recent_values)
                            older_avg = np.mean(older_values)
                            
                            # Check for performance degradation
                            if recent_avg < older_avg * 0.9:  # 10% degradation
                                optimization = {
                                    'type': 'performance_degradation',
                                    'model': model,
                                    'metric': metric_name,
                                    'degradation': (older_avg - recent_avg) / older_avg,
                                    'recommendation': 'Consider model retraining or replacement'
                                }
                                optimizations.append(optimization)
                                
                                # Create optimization rule
                                await self._create_optimization_rule(
                                    f"degrade_{model}_{metric_name}",
                                    f"model={model} AND metric={metric_name} AND degradation>0.1",
                                    "suggest_alternative_model",
                                    0.8
                                )
            
            # Analyze user satisfaction trends
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT model_used, AVG(user_rating) as avg_rating, COUNT(*) as count
                FROM user_interactions
                WHERE user_rating IS NOT NULL
                AND timestamp > datetime('now', '-7 days')
                GROUP BY model_used
                HAVING count >= 5
            ''')
            
            for row in cursor.fetchall():
                model, avg_rating, count = row
                if avg_rating < 3.0:  # Low satisfaction
                    optimization = {
                        'type': 'low_satisfaction',
                        'model': model,
                        'avg_rating': avg_rating,
                        'sample_size': count,
                        'recommendation': 'Investigate model issues or user training'
                    }
                    optimizations.append(optimization)
            
            conn.close()
            
            return {
                'optimizations': optimizations,
                'total_optimizations': len(optimizations),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error optimizing model selection: {e}")
            return {'error': str(e)}
    
    async def _create_optimization_rule(
        self,
        rule_name: str,
        condition: str,
        action: str,
        effectiveness: float
    ):
        """Create a new optimization rule"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO optimization_rules
                (rule_name, rule_condition, rule_action, effectiveness_score)
                VALUES (?, ?, ?, ?)
            ''', (rule_name, condition, action, effectiveness))
            
            conn.commit()
            conn.close()
            
            # Add to in-memory rules
            rule = {
                'name': rule_name,
                'condition': condition,
                'action': action,
                'effectiveness': effectiveness,
                'created': time.time()
            }
            self.optimization_rules.append(rule)
            
        except Exception as e:
            logger.error(f"Error creating optimization rule: {e}")
    
    async def apply_optimization_rules(self, context: Dict[str, Any]) -> List[str]:
        """Apply optimization rules based on current context"""
        try:
            applied_actions = []
            
            for rule in self.optimization_rules:
                if await self._evaluate_rule_condition(rule['condition'], context):
                    action = await self._execute_rule_action(rule['action'], context)
                    if action:
                        applied_actions.append(action)
                        
                        # Update rule usage
                        await self._update_rule_usage(rule['name'])
            
            return applied_actions
            
        except Exception as e:
            logger.error(f"Error applying optimization rules: {e}")
            return []
    
    async def _evaluate_rule_condition(self, condition: str, context: Dict[str, Any]) -> bool:
        """Evaluate if a rule condition is met"""
        try:
            # Simple condition evaluation (can be enhanced with a proper parser)
            # For now, handle basic conditions
            
            if "degradation>" in condition:
                threshold = float(condition.split("degradation>")[1])
                return context.get('degradation', 0) > threshold
            
            if "avg_rating<" in condition:
                threshold = float(condition.split("avg_rating<")[1])
                return context.get('avg_rating', 5) < threshold
            
            if "response_time>" in condition:
                threshold = float(condition.split("response_time>")[1])
                return context.get('response_time', 0) > threshold
            
            return False
            
        except Exception as e:
            logger.error(f"Error evaluating rule condition: {e}")
            return False
    
    async def _execute_rule_action(self, action: str, context: Dict[str, Any]) -> Optional[str]:
        """Execute a rule action"""
        try:
            if action == "suggest_alternative_model":
                # Find alternative model with better performance
                current_model = context.get('model')
                task_type = context.get('task_type', 'general')
                
                # Get best performing model for this task
                best_model = None
                best_score = 0
                
                for model, metrics in self.model_performance.items():
                    if model != current_model and task_type in metrics:
                        avg_score = np.mean(metrics[task_type])
                        if avg_score > best_score:
                            best_score = avg_score
                            best_model = model
                
                if best_model:
                    return f"Suggested alternative model: {best_model} (score: {best_score:.2f})"
            
            elif action == "increase_timeout":
                return "Increased timeout for better response quality"
            
            elif action == "reduce_complexity":
                return "Reduced model complexity for faster responses"
            
            return None
            
        except Exception as e:
            logger.error(f"Error executing rule action: {e}")
            return None
    
    async def _update_rule_usage(self, rule_name: str):
        """Update rule usage statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE optimization_rules
                SET usage_count = usage_count + 1,
                    last_applied = CURRENT_TIMESTAMP
                WHERE rule_name = ?
            ''', (rule_name,))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating rule usage: {e}")
    
    async def _continuous_learning_loop(self):
        """Background task for continuous learning and optimization"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                # Perform periodic learning tasks
                await self._periodic_pattern_analysis()
                await self._update_model_rankings()
                await self._cleanup_old_data()
                
                logger.info("Completed continuous learning cycle")
                
            except Exception as e:
                logger.error(f"Error in continuous learning loop: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes before retry
    
    async def _periodic_pattern_analysis(self):
        """Perform periodic analysis of interaction patterns"""
        try:
            # Analyze patterns for all users with recent activity
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT DISTINCT user_id
                FROM user_interactions
                WHERE timestamp > datetime('now', '-24 hours')
            ''')
            
            active_users = [row[0] for row in cursor.fetchall()]
            conn.close()
            
            for user_id in active_users:
                await self._analyze_user_patterns(user_id)
            
            logger.info(f"Analyzed patterns for {len(active_users)} active users")
            
        except Exception as e:
            logger.error(f"Error in periodic pattern analysis: {e}")
    
    async def _update_model_rankings(self):
        """Update global model performance rankings"""
        try:
            # Calculate global model rankings based on recent performance
            model_scores = {}
            
            for model, metrics in self.model_performance.items():
                total_score = 0
                metric_count = 0
                
                for metric_name, values in metrics.items():
                    if values:
                        # Weight recent values more heavily
                        recent_values = values[-10:] if len(values) >= 10 else values
                        avg_score = np.mean(recent_values)
                        total_score += avg_score
                        metric_count += 1
                
                if metric_count > 0:
                    model_scores[model] = total_score / metric_count
            
            # Store rankings
            if model_scores:
                sorted_models = sorted(model_scores.items(), key=lambda x: x[1], reverse=True)
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Clear old rankings
                cursor.execute('DELETE FROM learning_patterns WHERE pattern_type = "model_ranking"')
                
                # Insert new rankings
                cursor.execute('''
                    INSERT INTO learning_patterns (pattern_type, pattern_data, confidence_score)
                    VALUES (?, ?, ?)
                ''', ('model_ranking', json.dumps(sorted_models), 0.9))
                
                conn.commit()
                conn.close()
                
                logger.info(f"Updated model rankings: {sorted_models[:3]}")
            
        except Exception as e:
            logger.error(f"Error updating model rankings: {e}")
    
    async def _cleanup_old_data(self):
        """Clean up old learning data to maintain performance"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Remove interactions older than 90 days
            cursor.execute('''
                DELETE FROM user_interactions
                WHERE timestamp < datetime('now', '-90 days')
            ''')
            
            # Remove performance metrics older than 30 days
            cursor.execute('''
                DELETE FROM performance_metrics
                WHERE timestamp < datetime('now', '-30 days')
            ''')
            
            # Remove unused optimization rules
            cursor.execute('''
                DELETE FROM optimization_rules
                WHERE usage_count = 0 AND created_at < datetime('now', '-7 days')
            ''')
            
            conn.commit()
            conn.close()
            
            # Clean up in-memory data
            cutoff_time = time.time() - (90 * 24 * 3600)  # 90 days
            for user_id in list(self.learning_data.keys()):
                self.learning_data[user_id] = [
                    interaction for interaction in self.learning_data[user_id]
                    if interaction['timestamp'] > cutoff_time
                ]
                
                if not self.learning_data[user_id]:
                    del self.learning_data[user_id]
            
            logger.info("Completed data cleanup")
            
        except Exception as e:
            logger.error(f"Error in data cleanup: {e}")
    
    async def get_learning_insights(self) -> Dict[str, Any]:
        """Get insights from the learning system"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get user activity stats
            cursor.execute('''
                SELECT COUNT(DISTINCT user_id) as active_users,
                       COUNT(*) as total_interactions,
                       AVG(user_rating) as avg_rating
                FROM user_interactions
                WHERE timestamp > datetime('now', '-7 days')
            ''')
            
            stats = cursor.fetchone()
            active_users, total_interactions, avg_rating = stats
            
            # Get model usage stats
            cursor.execute('''
                SELECT model_used, COUNT(*) as usage_count
                FROM user_interactions
                WHERE timestamp > datetime('now', '-7 days')
                GROUP BY model_used
                ORDER BY usage_count DESC
                LIMIT 5
            ''')
            
            top_models = cursor.fetchall()
            
            # Get learning patterns
            cursor.execute('''
                SELECT pattern_type, COUNT(*) as pattern_count
                FROM learning_patterns
                GROUP BY pattern_type
            ''')
            
            patterns = cursor.fetchall()
            
            conn.close()
            
            return {
                'active_users': active_users or 0,
                'total_interactions': total_interactions or 0,
                'average_rating': round(avg_rating or 0, 2),
                'top_models': [{'model': model, 'usage': count} for model, count in top_models],
                'learning_patterns': [{'type': ptype, 'count': count} for ptype, count in patterns],
                'optimization_rules': len(self.optimization_rules),
                'performance_metrics': len(self.performance_history)
            }
            
        except Exception as e:
            logger.error(f"Error getting learning insights: {e}")
            return {}
    
    async def export_learning_data(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Export learning data for analysis or backup"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            export_data = {}
            
            if user_id:
                # Export specific user data
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM user_interactions WHERE user_id = ?
                ''', (user_id,))
                
                interactions = cursor.fetchall()
                export_data['interactions'] = interactions
                
                cursor.execute('''
                    SELECT * FROM user_preferences WHERE user_id = ?
                ''', (user_id,))
                
                preferences = cursor.fetchall()
                export_data['preferences'] = preferences
            else:
                # Export aggregated data
                cursor = conn.cursor()
                
                # Export learning patterns
                cursor.execute('SELECT * FROM learning_patterns')
                export_data['patterns'] = cursor.fetchall()
                
                # Export optimization rules
                cursor.execute('SELECT * FROM optimization_rules')
                export_data['rules'] = cursor.fetchall()
                
                # Export performance summary
                cursor.execute('''
                    SELECT model_name, metric_name, AVG(metric_value) as avg_value
                    FROM performance_metrics
                    GROUP BY model_name, metric_name
                ''')
                export_data['performance_summary'] = cursor.fetchall()
            
            conn.close()
            
            export_data['export_timestamp'] = datetime.now().isoformat()
            export_data['export_type'] = 'user_specific' if user_id else 'aggregated'
            
            return export_data
            
        except Exception as e:
            logger.error(f"Error exporting learning data: {e}")
            return {'error': str(e)}
    
    async def import_learning_data(self, import_data: Dict[str, Any]) -> Dict[str, str]:
        """Import learning data from backup or external source"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            imported_items = 0
            
            # Import patterns
            if 'patterns' in import_data:
                for pattern in import_data['patterns']:
                    cursor.execute('''
                        INSERT OR REPLACE INTO learning_patterns
                        (pattern_type, pattern_data, confidence_score, usage_count)
                        VALUES (?, ?, ?, ?)
                    ''', pattern[1:5])  # Skip ID
                    imported_items += 1
            
            # Import rules
            if 'rules' in import_data:
                for rule in import_data['rules']:
                    cursor.execute('''
                        INSERT OR REPLACE INTO optimization_rules
                        (rule_name, rule_condition, rule_action, effectiveness_score, usage_count)
                        VALUES (?, ?, ?, ?, ?)
                    ''', rule[1:6])  # Skip ID
                    imported_items += 1
            
            conn.commit()
            conn.close()
            
            return {
                'status': 'success',
                'imported_items': imported_items,
                'message': f'Successfully imported {imported_items} learning items'
            }
            
        except Exception as e:
            logger.error(f"Error importing learning data: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def reset_learning_data(self, confirm: bool = False) -> Dict[str, str]:
        """Reset all learning data (use with caution)"""
        if not confirm:
            return {
                'status': 'confirmation_required',
                'message': 'This will delete all learning data. Set confirm=True to proceed.'
            }
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Clear all learning tables
            cursor.execute('DELETE FROM user_interactions')
            cursor.execute('DELETE FROM performance_metrics')
            cursor.execute('DELETE FROM learning_patterns')
            cursor.execute('DELETE FROM user_preferences')
            cursor.execute('DELETE FROM optimization_rules')
            
            conn.commit()
            conn.close()
            
            # Clear in-memory data
            self.learning_data.clear()
            self.performance_history.clear()
            self.user_preferences.clear()
            self.model_performance.clear()
            self.optimization_rules.clear()
            
            return {
                'status': 'success',
                'message': 'All learning data has been reset'
            }
            
        except Exception as e:
            logger.error(f"Error resetting learning data: {e}")
            return {'status': 'error', 'message': str(e)}