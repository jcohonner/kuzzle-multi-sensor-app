import React, { Component } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { styles, orange } from '../styles/styles'
import { connect } from 'react-redux'
import { setKuzzleSettings } from '../store/actions'
import PropTypes from 'prop-types'
import { store } from '../App'


class Settings extends Component {
  constructor(props) {
    super(props)
    console.log('store:', store);
    this.state = {
      hostname: store.getState().kuzzleSettings.hostname,
      port: store.getState().kuzzleSettings.port
    }
  }

  updateKuzzleSettings = () => {
    if (this.state.hostname === '')
      return

    this.props.dispatchKuzzleSettings({
      hostname: this.state.hostname,
      port: this.state.port,
    })
  }

  updateDeviceUID = () => {
    console.log("TODO: updateDeviceUID");
  }


  render() {
    return (
      <View style={styles.container}>
        <View style={styles.framed}>
            <Text style={styles.card_header}>Kuzzle Server</Text>
            <TextInput
              placeholder="kuzzle host"
              style={styles.input}
              value={this.state.hostname}
              keyboardType='url'
              onChangeText={(text) => this.setState({ hostname: text })}
            />
            <TextInput
              placeholder="kuzzle port"
              style={styles.input}
              value={this.state.port.toString()}
              keyboardType='numeric'
              onChangeText={(text) => this.setState({ port: text.parseInt() })}
            />
            <Button color={orange} onPress={this.updateKuzzleSettings} title='Apply' />
        </View>
        <View style={styles.framed}>
            <Text style={styles.card_header}>Device</Text>
            <TextInput placeholder="base uid" style={styles.input} />
            <Button color={orange} onPress={this.updateDeviceUID} title='Apply' />
        </View>
      </View>
    )
  }
}

const mapStateToProps = state => {
  return {
  }
}

const mapDispatchToProps = dispatch => {
  console.log('mapDispatchToProps');
  return {
    dispatchKuzzleSettings: (settings) => {
      action = setKuzzleSettings(settings.hostname, settings.port)
      dispatch(action)
    },
  }
}

const KuzzleSettings = connect(
  mapStateToProps,
  mapDispatchToProps
)(Settings)

export default KuzzleSettings