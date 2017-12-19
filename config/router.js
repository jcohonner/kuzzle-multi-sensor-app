import React from 'react'
import { StackNavigator } from 'react-navigation'
import {Text, Button, Alert} from 'react-native'


import Login from '../screens/Login'
import Dashboard from '../screens/Dashboard'
import KuzzleSettings from '../screens/Settings'

export const AppStack = StackNavigator({
  Login: {
    screen: Login,
    navigationOptions: {
      title: 'Kuzzle IoT',
    },

  },
  Dashboard: {
    screen: Dashboard,
    navigationOptions: {
      title: 'Dashboard',
    },
  },

  Settings: {
    screen: KuzzleSettings,
    navigationOptions: {
      title: 'Settings',
    },
  }
})