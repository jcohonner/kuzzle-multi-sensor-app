import React, { Component } from 'react'
import { View, Text, Alert, Button } from 'react-native'
import LoginCmp from '../components/Login'
import { styles } from '../styles/styles'
import {store} from '../App'
import {setUserCredentials} from '../store/actions'

export default class Login extends Component {
  constructor(props) {
    super(props)
  }

  static navigationOptions = ({ navigation }) => {
    let headerRight = (
      <Button
        title="Settings"
        onPress={() => { navigation.navigate('Settings') }}
      />
    );
    return { headerRight };
  }

  onLogin(credentials) {
    {
      console.log('onLogin:', credentials)
      store.dispatch(setUserCredentials(credentials.userName, credentials.password))
      this.props.navigation.navigate('Dashboard')
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <LoginCmp
          userName={store.getState().kuzzleSettings.user ? store.getState().kuzzleSettings.user:""}
          password={store.getState().kuzzleSettings.password  ? store.getState().kuzzleSettings.password : ""}
          onLogin={(credentials) => this.onLogin(credentials)}
          onSignup={() => { Alert.alert('Signup') }}
        />
      </View>
    )
  }
}